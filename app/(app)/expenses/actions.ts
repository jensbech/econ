"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accounts, categories, expenses, loans } from "@/db/schema";
import { logCreate, logDelete, logUpdate } from "@/lib/audit";
import { validateCsrfOrigin } from "@/lib/csrf-validate";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { checkRateLimit } from "@/lib/rate-limit";
import {
	extractFieldErrors,
	nokToOere,
	parseDateToIso,
} from "@/lib/server-utils";

export type ExpenseFormState = {
	error?: string | null;
	fieldErrors?: Record<string, string[]>;
	warning?: string | null;
	duplicateWarning?: boolean;
} | null;

const ExpenseSchema = z.object({
	date: z
		.string()
		.min(1, "Dato er påkrevd")
		.refine((d) => parseDateToIso(d) !== null, "Ugyldig dato"),
	amount: z.string().min(1, "Beløp er påkrevd"),
	categoryId: z.string().optional(),
	accountId: z.string().optional(),
	notes: z.string().max(500).optional(),
	loanId: z.string().optional(),
	interestAmount: z.string().optional(),
	principalAmount: z.string().optional(),
});

export async function createExpense(
	_prevState: ExpenseFormState,
	formData: FormData,
): Promise<ExpenseFormState> {
	await validateCsrfOrigin();
	const user = await verifySession();
	if (!user.id) {
		return { error: "User ID not available" };
	}

	// Rate limiting: max 20 expenses per minute per user
	try {
		checkRateLimit(`expense:create:${user.id}`, 20, 60);
	} catch (error) {
		return { error: "Too many expense creations. Please try again later." };
	}

	const householdId = await getHouseholdId(user.id);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const force = formData.get("force") === "true";

	const raw = {
		date: formData.get("date") as string,
		amount: formData.get("amount") as string,
		categoryId: (formData.get("categoryId") as string) || undefined,
		accountId: (formData.get("accountId") as string) || undefined,
		notes: (formData.get("notes") as string) || undefined,
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

	// Validate accountId belongs to this household (CRIT-02)
	if (parsed.data.accountId) {
		const [acct] = await db
			.select({ id: accounts.id })
			.from(accounts)
			.where(
				and(
					eq(accounts.id, parsed.data.accountId),
					eq(accounts.householdId, householdId),
					isNull(accounts.deletedAt),
				),
			)
			.limit(1);
		if (!acct) return { fieldErrors: { accountId: ["Ugyldig konto"] } };
	}

	// Validate loanId belongs to this household (CRIT-02)
	if (parsed.data.loanId) {
		const [loan] = await db
			.select({ id: loans.id })
			.from(loans)
			.where(
				and(
					eq(loans.id, parsed.data.loanId),
					eq(loans.householdId, householdId),
					isNull(loans.deletedAt),
				),
			)
			.limit(1);
		if (!loan) return { fieldErrors: { loanId: ["Ugyldig lån"] } };
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
			userId: user.id,
			categoryId: parsed.data.categoryId ?? null,
			accountId: parsed.data.accountId ?? null,
			amountOere,
			date: parsed.data.date,
			notes: parsed.data.notes ?? null,
			loanId: parsed.data.loanId ?? null,
			interestOere,
			principalOere,
		})
		.returning({ id: expenses.id });

	// Log the expense creation
	if (inserted) {
		await logCreate(householdId, user.id, "expense", inserted.id, {
			amount: amountOere,
			date: parsed.data.date,
			category: parsed.data.categoryId,
			account: parsed.data.accountId,
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
	await validateCsrfOrigin();
	const user = await verifySession();
	if (!user.id) {
		return { error: "User ID not available" };
	}

	// Rate limiting: max 20 updates per minute per user
	try {
		checkRateLimit(`expense:update:${user.id}`, 20, 60);
	} catch (error) {
		return { error: "Too many expense updates. Please try again later." };
	}

	const householdId = await getHouseholdId(user.id);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const raw = {
		date: formData.get("date") as string,
		amount: formData.get("amount") as string,
		categoryId: (formData.get("categoryId") as string) || undefined,
		accountId: (formData.get("accountId") as string) || undefined,
		notes: (formData.get("notes") as string) || undefined,
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

	// Validate accountId belongs to this household (CRIT-02)
	if (parsed.data.accountId) {
		const [acct] = await db
			.select({ id: accounts.id })
			.from(accounts)
			.where(
				and(
					eq(accounts.id, parsed.data.accountId),
					eq(accounts.householdId, householdId),
					isNull(accounts.deletedAt),
				),
			)
			.limit(1);
		if (!acct) return { fieldErrors: { accountId: ["Ugyldig konto"] } };
	}

	// Validate loanId belongs to this household (CRIT-02)
	if (parsed.data.loanId) {
		const [loan] = await db
			.select({ id: loans.id })
			.from(loans)
			.where(
				and(
					eq(loans.id, parsed.data.loanId),
					eq(loans.householdId, householdId),
					isNull(loans.deletedAt),
				),
			)
			.limit(1);
		if (!loan) return { fieldErrors: { loanId: ["Ugyldig lån"] } };
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
				eq(expenses.userId, user.id),
				isNull(expenses.deletedAt),
			),
		);

	await logUpdate(householdId, user.id, "expense", id, {
		amount: amountOere,
		date: parsed.data.date,
		category: parsed.data.categoryId,
		account: parsed.data.accountId,
	});

	revalidatePath("/expenses");
	revalidatePath("/savings");
	revalidatePath("/loans");
	redirect("/expenses");
}

export async function deleteExpense(id: string): Promise<void> {
	await validateCsrfOrigin();
	const user = await verifySession();
	if (!user.id) {
		throw new Error("User ID not available");
	}

	// Rate limiting: max 10 deletions per minute per user
	try {
		checkRateLimit(`expense:delete:${user.id}`, 10, 60);
	} catch {
		throw new Error("Too many delete requests. Please try again later.");
	}

	const householdId = await getHouseholdId(user.id);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	// AUTHORIZATION: Verify expense exists and belongs to this household (LOW-04)
	const [expense] = await db
		.select({ id: expenses.id })
		.from(expenses)
		.where(
			and(
				eq(expenses.id, id),
				eq(expenses.householdId, householdId),
				isNull(expenses.deletedAt),
			),
		)
		.limit(1);

	if (!expense) {
		throw new Error("Expense not found or access denied");
	}

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

	await logDelete(householdId, user.id, "expense", id, "Expense deleted");

	revalidatePath("/expenses");
	revalidatePath("/savings");
	revalidatePath("/loans");
	redirect("/expenses");
}

// Deletes without redirect — used from the expense list table
export async function deleteExpenseNoRedirect(
	id: string,
): Promise<{ error: string } | void> {
	await validateCsrfOrigin();
	const user = await verifySession();
	if (!user.id) {
		throw new Error("User ID not available");
	}

	// Rate limiting: max 10 deletions per minute per user
	try {
		checkRateLimit(`expense:delete:${user.id}`, 10, 60);
	} catch {
		return { error: "Too many delete requests. Please try again later." };
	}

	const householdId = await getHouseholdId(user.id);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	// AUTHORIZATION: Verify expense exists and belongs to this household before deletion
	const [expense] = await db
		.select({ id: expenses.id })
		.from(expenses)
		.where(
			and(
				eq(expenses.id, id),
				eq(expenses.householdId, householdId),
				isNull(expenses.deletedAt),
			),
		)
		.limit(1);

	if (!expense) {
		throw new Error("Expense not found or access denied");
	}

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

	await logDelete(householdId, user.id, "expense", id, "Expense deleted");

	revalidatePath("/expenses");
	revalidatePath("/savings");
	revalidatePath("/loans");
}
