"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { categories, expenses, loans } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { extractFieldErrors, nokToOere } from "@/lib/server-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { logCreate, logUpdate, logDelete } from "@/lib/audit";

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
	openingBalance: z.string().optional(),
	openingBalanceDate: z.string().optional(),
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
	if (!user.id) return { error: "User ID not available" };

	// Rate limiting: max 5 loans per hour per user
	try {
		checkRateLimit(`loan:create:${user.id}`, 5, 3600);
	} catch (error) {
		return { error: "Too many loan creations. Please try again later." };
	}

	const householdId = await getHouseholdId(user.id);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const raw = {
		name: formData.get("name") as string,
		type: formData.get("type") as string,
		principal: formData.get("principal") as string,
		interestRate: formData.get("interestRate") as string,
		termMonths: formData.get("termMonths") as string,
		startDate: formData.get("startDate") as string,
		accountId: (formData.get("accountId") as string) || undefined,
		openingBalance: (formData.get("openingBalance") as string) || undefined,
		openingBalanceDate: (formData.get("openingBalanceDate") as string) || undefined,
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
	if (
		Number.isNaN(interestRate) ||
		interestRate < 0 ||
		interestRate > 100 ||
		!Number.isFinite(interestRate)
	) {
		return {
			fieldErrors: {
				interestRate: ["Rente må være mellom 0 og 100 prosent"],
			},
		};
	}

	// Validate interest rate precision: max 2 decimal places
	const roundedRate = Math.round(interestRate * 100) / 100;
	if (interestRate !== roundedRate) {
		return {
			fieldErrors: {
				interestRate: ["Rente må ha maks 2 desimaler (f.eks. 3,50%)"],
			},
		};
	}

	const termMonths = Number.parseInt(parsed.data.termMonths, 10);
	if (Number.isNaN(termMonths) || termMonths <= 0) {
		return { fieldErrors: { termMonths: ["Ugyldig løpetid"] } };
	}

	let openingBalanceOere: number | null = null;
	const openingBalanceDate: string | null = parsed.data.openingBalanceDate || null;

	if (parsed.data.openingBalance || openingBalanceDate) {
		if (!parsed.data.openingBalance || !openingBalanceDate) {
			return { fieldErrors: { openingBalance: ["Både restgjeld og dato må fylles ut sammen"] } };
		}
		if (openingBalanceDate < parsed.data.startDate) {
			return { fieldErrors: { openingBalanceDate: ["Dato må være lik eller etter startdato"] } };
		}
		try {
			openingBalanceOere = nokToOere(parsed.data.openingBalance);
		} catch {
			return { fieldErrors: { openingBalance: ["Ugyldig beløp"] } };
		}
	}

	const [inserted] = await db
		.insert(loans)
		.values({
			householdId,
			userId: user.id,
			name: parsed.data.name,
			type: parsed.data.type,
			principalOere,
			interestRate,
			termMonths,
			startDate: parsed.data.startDate,
			accountId: parsed.data.accountId ?? null,
			openingBalanceOere,
			openingBalanceDate,
		})
		.returning({ id: loans.id });

	// Log the loan creation
	await logCreate(householdId, user.id, "loan", inserted.id, {
		name: parsed.data.name,
		type: parsed.data.type,
		principalOere,
		interestRate,
		termMonths,
	});

	revalidatePath("/loans");
	redirect("/loans");
}

export async function deleteLoan(id: string): Promise<void> {
	const user = await verifySession();
	if (!user.id) throw new Error("User ID not available");

	// Rate limiting: max 5 deletions per hour per user
	checkRateLimit(`loan:delete:${user.id}`, 5, 3600);

	const householdId = await getHouseholdId(user.id);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	// AUTHORIZATION: Verify loan exists and belongs to the household/user
	const [loan] = await db
		.select({ id: loans.id })
		.from(loans)
		.where(
			and(
				eq(loans.id, id),
				eq(loans.householdId, householdId),
				isNull(loans.deletedAt),
			),
		)
		.limit(1);

	if (!loan) {
		throw new Error("Loan not found or access denied");
	}

	await db
		.update(loans)
		.set({ deletedAt: new Date() })
		.where(eq(loans.id, id));

	// Log the deletion
	await logDelete(householdId, user.id, "loan", id, "User initiated deletion");

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

	// Create expense with "Lån" category (single source of truth for balance)
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
	if (!user.id) throw new Error("User ID not available");

	// Rate limiting: max 10 payment deletions per minute per user
	checkRateLimit(`loan:payment:delete:${user.id}`, 10, 60);

	const householdId = await getHouseholdId(user.id);
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

	// AUTHORIZATION: Verify the expense belongs to this loan and household
	const [payment] = await db
		.select({ id: expenses.id })
		.from(expenses)
		.where(
			and(
				eq(expenses.id, paymentId),
				eq(expenses.loanId, loanId),
				eq(expenses.householdId, householdId),
				isNull(expenses.deletedAt),
			),
		)
		.limit(1);

	if (!payment) throw new Error("Payment not found");

	await db
		.update(expenses)
		.set({ deletedAt: new Date() })
		.where(eq(expenses.id, paymentId));

	// Log the deletion
	await logDelete(householdId, user.id, "loanPayment", paymentId, "User initiated deletion");

	revalidatePath(`/loans/${loanId}`);
}
