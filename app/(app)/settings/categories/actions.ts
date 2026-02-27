"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { validateCsrfOrigin } from "@/lib/csrf-validate";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_CATEGORIES = 200;

const validateCategoryName = (name: string): boolean => {
	if (/[\x00-\x1f\x7f-\x9f]/.test(name)) return false;
	if (/\s{2,}/.test(name)) return false;
	return true;
};

const AddCategorySchema = z.object({
	name: z
		.string()
		.min(1, "Navn er påkrevd")
		.max(100)
		.refine(validateCategoryName, "Ugyldig tegn i navn"),
	type: z.enum(["expense", "income"]),
});

const RenameCategorySchema = z.object({
	id: z.string().min(1),
	name: z
		.string()
		.min(1, "Navn er påkrevd")
		.max(100)
		.refine(validateCategoryName, "Ugyldig tegn i navn"),
});

export async function addCategory(formData: FormData) {
	await validateCsrfOrigin();
	const user = await verifySession();
	try {
		checkRateLimit(`category:add:${user.id}`, 20, 60);
	} catch {
		return { error: "Too many requests. Please try again later." };
	}
	const householdId = await getHouseholdId(user.id);
	if (!householdId) throw new Error("No household found");

	const parsed = AddCategorySchema.safeParse({
		name: formData.get("name"),
		type: formData.get("type"),
	});
	if (!parsed.success) throw new Error("Ugyldig skjemadata");

	let categoryName = parsed.data.name.trim();
	categoryName = categoryName.normalize("NFKC");

	// Enforce category count cap (HIGH-08)
	const [{ cnt }] = await db
		.select({ cnt: sql<number>`count(*)::int` })
		.from(categories)
		.where(
			and(
				eq(categories.householdId, householdId),
				isNull(categories.deletedAt),
			),
		);
	if (cnt >= MAX_CATEGORIES)
		throw new Error(`Maks ${MAX_CATEGORIES} kategorier per husholdning`);

	// Check for duplicate category name
	const [existing] = await db
		.select({ id: categories.id })
		.from(categories)
		.where(
			and(
				eq(categories.householdId, householdId),
				eq(categories.name, categoryName),
				eq(categories.type, parsed.data.type),
				isNull(categories.deletedAt),
			),
		)
		.limit(1);

	if (existing) {
		throw new Error("Kategori med dette navn finnes allerede");
	}

	await db.insert(categories).values({
		householdId,
		name: categoryName,
		type: parsed.data.type,
		isDefault: false,
	});

	revalidatePath("/settings/categories");
}

export async function renameCategory(formData: FormData) {
	await validateCsrfOrigin();
	const user = await verifySession();
	try {
		checkRateLimit(`category:rename:${user.id}`, 20, 60);
	} catch {
		return { error: "Too many requests. Please try again later." };
	}
	const householdId = await getHouseholdId(user.id);
	if (!householdId) throw new Error("No household found");

	const parsed = RenameCategorySchema.safeParse({
		id: formData.get("id"),
		name: formData.get("name"),
	});
	if (!parsed.success) throw new Error("Ugyldig skjemadata");

	let newName = parsed.data.name.trim();
	newName = newName.normalize("NFKC");

	// Get the current category to find its type
	const [currentCategory] = await db
		.select({ type: categories.type })
		.from(categories)
		.where(
			and(
				eq(categories.id, parsed.data.id),
				eq(categories.householdId, householdId),
				isNull(categories.deletedAt),
			),
		)
		.limit(1);

	if (!currentCategory) {
		throw new Error("Kategori ikke funnet");
	}

	// Check for duplicate name within same type
	const [duplicate] = await db
		.select({ id: categories.id })
		.from(categories)
		.where(
			and(
				eq(categories.householdId, householdId),
				eq(categories.name, newName),
				eq(categories.type, currentCategory.type),
				isNull(categories.deletedAt),
			),
		)
		.limit(1);

	if (duplicate && duplicate.id !== parsed.data.id) {
		throw new Error("Kategori med dette navn finnes allerede");
	}

	await db
		.update(categories)
		.set({ name: newName })
		.where(
			and(
				eq(categories.id, parsed.data.id),
				eq(categories.householdId, householdId),
				isNull(categories.deletedAt),
			),
		);

	revalidatePath("/settings/categories");
}

export async function deleteCategory(formData: FormData) {
	await validateCsrfOrigin();
	const user = await verifySession();
	try {
		checkRateLimit(`category:delete:${user.id}`, 10, 60);
	} catch {
		throw new Error("Too many requests. Please try again later.");
	}
	const householdId = await getHouseholdId(user.id);
	if (!householdId) throw new Error("No household found");

	const id = formData.get("id");
	if (typeof id !== "string" || !id) throw new Error("Manglende id");

	await db
		.update(categories)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(categories.id, id),
				eq(categories.householdId, householdId),
				isNull(categories.deletedAt),
			),
		);

	revalidatePath("/settings/categories");
}
