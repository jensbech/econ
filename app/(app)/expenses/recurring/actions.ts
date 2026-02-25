"use server";

import { and, eq, gte, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { categories, expenses, recurringTemplates } from "@/db/schema";
import { validateCsrfOrigin } from "@/lib/csrf-validate";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { checkRateLimit } from "@/lib/rate-limit";
import { extractFieldErrors, nokToOere } from "@/lib/server-utils";

export type TemplateFormState = {
	error?: string | null;
	fieldErrors?: Record<string, string[]>;
} | null;

const TemplateSchema = z.object({
	description: z.string().min(1, "Beskrivelse er påkrevd"),
	amount: z.string().min(1, "Beløp er påkrevd"),
	categoryId: z.string().optional(),
	frequency: z
		.string()
		.refine(
			(v) => ["weekly", "monthly", "annual"].includes(v),
			"Velg en frekvens",
		),
	startDate: z.string().min(1, "Startdato er påkrevd"),
	endDate: z.string().optional(),
});

export async function createRecurringTemplate(
	_prevState: TemplateFormState,
	formData: FormData,
): Promise<TemplateFormState> {
	await validateCsrfOrigin();
	const user = await verifySession();
	try {
		checkRateLimit(`recurring:create:${user.id}`, 5, 3600);
	} catch {
		return { error: "Too many template creations. Please try again later." };
	}
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const raw = {
		description: formData.get("description") as string,
		amount: formData.get("amount") as string,
		categoryId: (formData.get("categoryId") as string) || undefined,
		frequency: formData.get("frequency") as string,
		startDate: formData.get("startDate") as string,
		endDate: (formData.get("endDate") as string) || undefined,
	};

	const parsed = TemplateSchema.safeParse(raw);
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

	await db.insert(recurringTemplates).values({
		householdId,
		userId: user.id as string,
		categoryId: parsed.data.categoryId ?? null,
		amountOere,
		frequency: parsed.data.frequency as "weekly" | "monthly" | "annual",
		startDate: parsed.data.startDate,
		endDate: parsed.data.endDate ?? null,
		type: "expense",
		description: parsed.data.description,
	});

	revalidatePath("/expenses/recurring");
	revalidatePath("/expenses");
	redirect("/expenses/recurring");
}

export async function updateRecurringTemplate(
	id: string,
	_prevState: TemplateFormState,
	formData: FormData,
): Promise<TemplateFormState> {
	await validateCsrfOrigin();
	const user = await verifySession();
	try {
		checkRateLimit(`recurring:update:${user.id}`, 10, 60);
	} catch {
		return { error: "Too many template updates. Please try again later." };
	}
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const raw = {
		description: formData.get("description") as string,
		amount: formData.get("amount") as string,
		categoryId: (formData.get("categoryId") as string) || undefined,
		frequency: formData.get("frequency") as string,
		startDate: formData.get("startDate") as string,
		endDate: (formData.get("endDate") as string) || undefined,
	};

	const parsed = TemplateSchema.safeParse(raw);
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

	// Soft-delete all future generated expenses for this template
	// Include householdId to guard against cross-household tampering
	const today = new Date().toISOString().slice(0, 10);
	await db
		.update(expenses)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(expenses.recurringTemplateId, id),
				eq(expenses.householdId, householdId),
				gte(expenses.date, today),
				isNull(expenses.deletedAt),
			),
		);

	// Update the template
	await db
		.update(recurringTemplates)
		.set({
			description: parsed.data.description,
			categoryId: parsed.data.categoryId ?? null,
			amountOere,
			frequency: parsed.data.frequency as "weekly" | "monthly" | "annual",
			startDate: parsed.data.startDate,
			endDate: parsed.data.endDate ?? null,
		})
		.where(
			and(
				eq(recurringTemplates.id, id),
				eq(recurringTemplates.householdId, householdId),
				isNull(recurringTemplates.deletedAt),
			),
		);

	revalidatePath("/expenses/recurring");
	revalidatePath("/expenses");
	redirect("/expenses/recurring");
}

export async function deleteRecurringTemplate(id: string): Promise<void> {
	await validateCsrfOrigin();
	const user = await verifySession();
	checkRateLimit(`recurring:delete:${user.id}`, 5, 3600);
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	await db
		.update(recurringTemplates)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(recurringTemplates.id, id),
				eq(recurringTemplates.householdId, householdId),
				isNull(recurringTemplates.deletedAt),
			),
		);

	revalidatePath("/expenses/recurring");
	revalidatePath("/expenses");
}
