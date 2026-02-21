"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { categories, expenses } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { extractFieldErrors, nokToOere } from "@/lib/server-utils";

export type ExpenseFormState = {
	error?: string | null;
	fieldErrors?: Record<string, string[]>;
} | null;

const ExpenseSchema = z.object({
	date: z.string().min(1, "Dato er påkrevd"),
	amount: z.string().min(1, "Beløp er påkrevd"),
	categoryId: z.string().optional(),
	notes: z.string().optional(),
});

export async function createExpense(
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
		notes: (formData.get("notes") as string) || undefined,
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

	await db.insert(expenses).values({
		householdId,
		userId: user.id as string,
		categoryId: parsed.data.categoryId ?? null,
		amountOere,
		date: parsed.data.date,
		notes: parsed.data.notes ?? null,
	});

	revalidatePath("/expenses");
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
		notes: (formData.get("notes") as string) || undefined,
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

	await db
		.update(expenses)
		.set({
			categoryId: parsed.data.categoryId ?? null,
			amountOere,
			date: parsed.data.date,
			notes: parsed.data.notes ?? null,
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
}
