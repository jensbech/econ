"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { categories, expenses, loanPayments, loans } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { extractFieldErrors, nokToOere } from "@/lib/server-utils";

export type LoanFormState = {
	error?: string | null;
	fieldErrors?: Record<string, string[]>;
} | null;

export type PaymentFormState = {
	error?: string | null;
	fieldErrors?: Record<string, string[]>;
} | null;

const LoanSchema = z.object({
	name: z.string().min(1, "Navn er påkrevd"),
	type: z.enum(["mortgage", "student", "car", "consumer", "other"]),
	principal: z.string().min(1, "Hovedstol er påkrevd"),
	interestRate: z.string().min(1, "Rente er påkrevd"),
	termMonths: z.string().min(1, "Løpetid er påkrevd"),
	startDate: z.string().min(1, "Startdato er påkrevd"),
	accountId: z.string().optional(),
});

const PaymentSchema = z.object({
	date: z.string().min(1, "Dato er påkrevd"),
	amount: z.string().min(1, "Beløp er påkrevd"),
	interestAmount: z.string().optional(),
	principalAmount: z.string().optional(),
});

export async function createLoan(
	_prevState: LoanFormState,
	formData: FormData,
): Promise<LoanFormState> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const raw = {
		name: formData.get("name") as string,
		type: formData.get("type") as string,
		principal: formData.get("principal") as string,
		interestRate: formData.get("interestRate") as string,
		termMonths: formData.get("termMonths") as string,
		startDate: formData.get("startDate") as string,
		accountId: (formData.get("accountId") as string) || undefined,
	};

	const parsed = LoanSchema.safeParse(raw);
	if (!parsed.success) {
		return { fieldErrors: extractFieldErrors(parsed.error) };
	}

	let principalOere: number;
	try {
		principalOere = nokToOere(parsed.data.principal);
	} catch {
		return { fieldErrors: { principal: ["Ugyldig beløp"] } };
	}

	const interestRate = Number.parseFloat(
		parsed.data.interestRate.replace(",", "."),
	);
	if (Number.isNaN(interestRate) || interestRate < 0) {
		return { fieldErrors: { interestRate: ["Ugyldig rente"] } };
	}

	const termMonths = Number.parseInt(parsed.data.termMonths, 10);
	if (Number.isNaN(termMonths) || termMonths <= 0) {
		return { fieldErrors: { termMonths: ["Ugyldig løpetid"] } };
	}

	await db.insert(loans).values({
		householdId,
		userId: user.id as string,
		name: parsed.data.name,
		type: parsed.data.type,
		principalOere,
		interestRate,
		termMonths,
		startDate: parsed.data.startDate,
		accountId: parsed.data.accountId ?? null,
	});

	revalidatePath("/loans");
	redirect("/loans");
}

export async function deleteLoan(id: string): Promise<void> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	await db
		.update(loans)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(loans.id, id),
				eq(loans.householdId, householdId),
				isNull(loans.deletedAt),
			),
		);

	revalidatePath("/loans");
	redirect("/loans");
}

export async function addLoanPayment(
	loanId: string,
	_prevState: PaymentFormState,
	formData: FormData,
): Promise<PaymentFormState> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	// Verify loan belongs to this household
	const [loan] = await db
		.select({ id: loans.id, accountId: loans.accountId })
		.from(loans)
		.where(
			and(
				eq(loans.id, loanId),
				eq(loans.householdId, householdId),
				isNull(loans.deletedAt),
			),
		)
		.limit(1);

	if (!loan) return { error: "Lån ikke funnet" };

	const raw = {
		date: formData.get("date") as string,
		amount: formData.get("amount") as string,
		interestAmount: (formData.get("interestAmount") as string) || undefined,
		principalAmount: (formData.get("principalAmount") as string) || undefined,
	};

	const parsed = PaymentSchema.safeParse(raw);
	if (!parsed.success) {
		return { fieldErrors: extractFieldErrors(parsed.error) };
	}

	let amountOere: number;
	try {
		amountOere = nokToOere(parsed.data.amount);
	} catch {
		return { fieldErrors: { amount: ["Ugyldig beløp"] } };
	}

	// Parse optional interest/principal split
	let interestOere: number | null = null;
	let principalOere: number | null = null;

	if (parsed.data.interestAmount) {
		try {
			interestOere = nokToOere(parsed.data.interestAmount);
		} catch {
			return { fieldErrors: { interestAmount: ["Ugyldig beløp for renter"] } };
		}
	}
	if (parsed.data.principalAmount) {
		try {
			principalOere = nokToOere(parsed.data.principalAmount);
		} catch {
			return { fieldErrors: { principalAmount: ["Ugyldig beløp for avdrag"] } };
		}
	}

	// Find the "Lån" category for this household
	const [loanCategory] = await db
		.select({ id: categories.id })
		.from(categories)
		.where(
			and(
				eq(categories.householdId, householdId),
				eq(categories.name, "Lån"),
				eq(categories.type, "expense"),
				isNull(categories.deletedAt),
			),
		)
		.limit(1);

	// Create the loanPayments row
	await db.insert(loanPayments).values({
		loanId,
		amountOere: principalOere ?? amountOere,
		date: parsed.data.date,
	});

	// Also create a corresponding expense with "Lån" category
	await db.insert(expenses).values({
		householdId,
		userId: user.id as string,
		categoryId: loanCategory?.id ?? null,
		amountOere,
		date: parsed.data.date,
		notes: `Lånebetaling`,
		loanId,
		interestOere,
		principalOere,
		accountId: loan.accountId,
	});

	revalidatePath(`/loans/${loanId}`);
	revalidatePath("/expenses");
	revalidatePath("/dashboard");
	return null;
}

export async function deleteLoanPayment(
	paymentId: string,
	loanId: string,
): Promise<void> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	// Verify loan belongs to this household
	const [loan] = await db
		.select({ id: loans.id })
		.from(loans)
		.where(
			and(
				eq(loans.id, loanId),
				eq(loans.householdId, householdId),
				isNull(loans.deletedAt),
			),
		)
		.limit(1);

	if (!loan) throw new Error("Lån ikke funnet");

	// Guard: ensure the payment belongs to the verified loan
	await db
		.delete(loanPayments)
		.where(
			and(eq(loanPayments.id, paymentId), eq(loanPayments.loanId, loanId)),
		);

	revalidatePath(`/loans/${loanId}`);
}
