"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { categories, expenses, loanPayments } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { extractFieldErrors, nokToOere } from "@/lib/server-utils";

export type ExpenseFormState = {
	error?: string | null;
	fieldErrors?: Record<string, string[]>;
	warning?: string | null;
	duplicateWarning?: boolean;
} | null;

const ExpenseSchema = z.object({
	date: z.string().min(1, "Dato er påkrevd"),
	amount: z.string().min(1, "Beløp er påkrevd"),
	categoryId: z.string().optional(),
	accountId: z.string().optional(),
	notes: z.string().optional(),
	savingsGoalId: z.string().optional(),
	loanId: z.string().optional(),
	interestAmount: z.string().optional(),
	principalAmount: z.string().optional(),
});

export async function createExpense(
	_prevState: ExpenseFormState,
	formData: FormData,
): Promise<ExpenseFormState> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const force = formData.get("force") === "true";

	const raw = {
		date: formData.get("date") as string,
		amount: formData.get("amount") as string,
		categoryId: (formData.get("categoryId") as string) || undefined,
		accountId: (formData.get("accountId") as string) || undefined,
		notes: (formData.get("notes") as string) || undefined,
		savingsGoalId: (formData.get("savingsGoalId") as string) || undefined,
		loanId: (formData.get("loanId") as string) || undefined,
		interestAmount: (formData.get("interestAmount") as string) || undefined,
		principalAmount: (formData.get("principalAmount") as string) || undefined,
	};

	const parsed = ExpenseSchema.safeParse(raw);
	if (!parsed.success) {
		return { fieldErrors: extractFieldErrors(parsed.error) };
	}

	let amountOere: number;
	try {
		amountOere = nokToOere(parsed.data.amount);
	} catch {
		return { fieldErrors: { amount: ["Ugyldig beløp"] } };
	}

	// Validate category belongs to this household
	if (parsed.data.categoryId) {
		const [cat] = await db
			.select({ id: categories.id })
			.from(categories)
			.where(
				and(
					eq(categories.id, parsed.data.categoryId),
					eq(categories.householdId, householdId),
					isNull(categories.deletedAt),
				),
			)
			.limit(1);
		if (!cat) return { fieldErrors: { categoryId: ["Ugyldig kategori"] } };
	}

	// Duplicate check: warn if same amount+date already exists
	if (!force) {
		const [dup] = await db
			.select({ id: expenses.id })
			.from(expenses)
			.where(
				and(
					eq(expenses.householdId, householdId),
					isNull(expenses.deletedAt),
					eq(expenses.date, parsed.data.date),
					sql`${expenses.amountOere} = ${amountOere}`,
				),
			)
			.limit(1);
		if (dup) {
			const nokStr = (amountOere / 100).toLocaleString("nb-NO", {
				minimumFractionDigits: 2,
			});
			return {
				duplicateWarning: true,
				warning: `Det finnes allerede en utgift på kr ${nokStr} for ${parsed.data.date}. Er du sikker på at dette ikke er en duplikat?`,
			};
		}
	}

	// Parse interest/principal for loan payments
	let interestOere: number | null = null;
	let principalOere: number | null = null;
	if (parsed.data.loanId && parsed.data.interestAmount) {
		try {
			interestOere = nokToOere(parsed.data.interestAmount);
		} catch {
			return { fieldErrors: { interestAmount: ["Ugyldig beløp for renter"] } };
		}
	}
	if (parsed.data.loanId && parsed.data.principalAmount) {
		try {
			principalOere = nokToOere(parsed.data.principalAmount);
		} catch {
			return { fieldErrors: { principalAmount: ["Ugyldig beløp for avdrag"] } };
		}
	}

	const [inserted] = await db
		.insert(expenses)
		.values({
			householdId,
			userId: user.id as string,
			categoryId: parsed.data.categoryId ?? null,
			accountId: parsed.data.accountId ?? null,
			amountOere,
			date: parsed.data.date,
			notes: parsed.data.notes ?? null,
			savingsGoalId: parsed.data.savingsGoalId ?? null,
			loanId: parsed.data.loanId ?? null,
			interestOere,
			principalOere,
		})
		.returning({ id: expenses.id });

	// Create loanPayments row for backward compat with computeLoanBalance
	if (parsed.data.loanId && inserted) {
		await db.insert(loanPayments).values({
			loanId: parsed.data.loanId,
			amountOere: principalOere ?? amountOere,
			date: parsed.data.date,
		});
	}

	revalidatePath("/expenses");
	revalidatePath("/savings");
	revalidatePath("/loans");
	redirect("/expenses");
}

export async function updateExpense(
	id: string,
	_prevState: ExpenseFormState,
	formData: FormData,
): Promise<ExpenseFormState> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const raw = {
		date: formData.get("date") as string,
		amount: formData.get("amount") as string,
		categoryId: (formData.get("categoryId") as string) || undefined,
		accountId: (formData.get("accountId") as string) || undefined,
		notes: (formData.get("notes") as string) || undefined,
		savingsGoalId: (formData.get("savingsGoalId") as string) || undefined,
		loanId: (formData.get("loanId") as string) || undefined,
		interestAmount: (formData.get("interestAmount") as string) || undefined,
		principalAmount: (formData.get("principalAmount") as string) || undefined,
	};

	const parsed = ExpenseSchema.safeParse(raw);
	if (!parsed.success) {
		return { fieldErrors: extractFieldErrors(parsed.error) };
	}

	let amountOere: number;
	try {
		amountOere = nokToOere(parsed.data.amount);
	} catch {
		return { fieldErrors: { amount: ["Ugyldig beløp"] } };
	}

	// Validate category belongs to this household
	if (parsed.data.categoryId) {
		const [cat] = await db
			.select({ id: categories.id })
			.from(categories)
			.where(
				and(
					eq(categories.id, parsed.data.categoryId),
					eq(categories.householdId, householdId),
					isNull(categories.deletedAt),
				),
			)
			.limit(1);
		if (!cat) return { fieldErrors: { categoryId: ["Ugyldig kategori"] } };
	}

	// Parse interest/principal for loan payments
	let interestOere: number | null = null;
	let principalOere: number | null = null;
	if (parsed.data.loanId && parsed.data.interestAmount) {
		try {
			interestOere = nokToOere(parsed.data.interestAmount);
		} catch {
			return { fieldErrors: { interestAmount: ["Ugyldig beløp for renter"] } };
		}
	}
	if (parsed.data.loanId && parsed.data.principalAmount) {
		try {
			principalOere = nokToOere(parsed.data.principalAmount);
		} catch {
			return { fieldErrors: { principalAmount: ["Ugyldig beløp for avdrag"] } };
		}
	}

	await db
		.update(expenses)
		.set({
			categoryId: parsed.data.categoryId ?? null,
			accountId: parsed.data.accountId ?? null,
			amountOere,
			date: parsed.data.date,
			notes: parsed.data.notes ?? null,
			savingsGoalId: parsed.data.savingsGoalId ?? null,
			loanId: parsed.data.loanId ?? null,
			interestOere,
			principalOere,
			// Editing a single occurrence unlinks it from any recurring template
			recurringTemplateId: null,
		})
		.where(
			and(
				eq(expenses.id, id),
				eq(expenses.householdId, householdId),
				isNull(expenses.deletedAt),
			),
		);

	revalidatePath("/expenses");
	revalidatePath("/savings");
	revalidatePath("/loans");
	redirect("/expenses");
}

export async function deleteExpense(id: string): Promise<void> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	await db
		.update(expenses)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(expenses.id, id),
				eq(expenses.householdId, householdId),
				isNull(expenses.deletedAt),
			),
		);

	revalidatePath("/expenses");
	revalidatePath("/savings");
	revalidatePath("/loans");
	redirect("/expenses");
}

// Deletes without redirect — used from the expense list table
export async function deleteExpenseNoRedirect(id: string): Promise<void> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	await db
		.update(expenses)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(expenses.id, id),
				eq(expenses.householdId, householdId),
				isNull(expenses.deletedAt),
			),
		);

	revalidatePath("/expenses");
	revalidatePath("/savings");
	revalidatePath("/loans");
}
