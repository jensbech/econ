"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { categories, incomeEntries } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { extractFieldErrors, nokToOere } from "@/lib/server-utils";

export type IncomeFormState = {
	error?: string | null;
	fieldErrors?: Record<string, string[]>;
} | null;

const IncomeSchema = z.object({
	date: z.string().min(1, "Dato er påkrevd"),
	amount: z.string().min(1, "Beløp er påkrevd"),
	source: z.string().optional(),
	type: z.enum(["salary", "variable"]),
	categoryId: z.string().optional(),
});

export async function createIncome(
	_prevState: IncomeFormState,
	formData: FormData,
): Promise<IncomeFormState> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const raw = {
		date: formData.get("date") as string,
		amount: formData.get("amount") as string,
		source: (formData.get("source") as string) || undefined,
		type: formData.get("type") as string,
		categoryId: (formData.get("categoryId") as string) || undefined,
	};

	const parsed = IncomeSchema.safeParse(raw);
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

	await db.insert(incomeEntries).values({
		householdId,
		userId: user.id as string,
		categoryId: parsed.data.categoryId ?? null,
		amountOere,
		date: parsed.data.date,
		source: parsed.data.source ?? null,
		type: parsed.data.type,
	});

	revalidatePath("/income");
	redirect("/income");
}

export async function updateIncome(
	id: string,
	_prevState: IncomeFormState,
	formData: FormData,
): Promise<IncomeFormState> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const raw = {
		date: formData.get("date") as string,
		amount: formData.get("amount") as string,
		source: (formData.get("source") as string) || undefined,
		type: formData.get("type") as string,
		categoryId: (formData.get("categoryId") as string) || undefined,
	};

	const parsed = IncomeSchema.safeParse(raw);
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
		.update(incomeEntries)
		.set({
			categoryId: parsed.data.categoryId ?? null,
			amountOere,
			date: parsed.data.date,
			source: parsed.data.source ?? null,
			type: parsed.data.type,
			// Editing a single occurrence unlinks it from any recurring template
			recurringTemplateId: null,
		})
		.where(
			and(
				eq(incomeEntries.id, id),
				eq(incomeEntries.householdId, householdId),
				isNull(incomeEntries.deletedAt),
			),
		);

	revalidatePath("/income");
	redirect("/income");
}

export async function deleteIncome(id: string): Promise<void> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	await db
		.update(incomeEntries)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(incomeEntries.id, id),
				eq(incomeEntries.householdId, householdId),
				isNull(incomeEntries.deletedAt),
			),
		);

	revalidatePath("/income");
	redirect("/income");
}

// Deletes without redirect — used from the income list table
export async function deleteIncomeNoRedirect(id: string): Promise<void> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	await db
		.update(incomeEntries)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(incomeEntries.id, id),
				eq(incomeEntries.householdId, householdId),
				isNull(incomeEntries.deletedAt),
			),
		);

	revalidatePath("/income");
}
