"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";

const AddCategorySchema = z.object({
	name: z.string().min(1, "Navn er påkrevd").max(100),
	type: z.enum(["expense", "income"]),
});

const RenameCategorySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1, "Navn er påkrevd").max(100),
});

export async function addCategory(formData: FormData) {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id);
	if (!householdId) throw new Error("No household found");

	const parsed = AddCategorySchema.safeParse({
		name: formData.get("name"),
		type: formData.get("type"),
	});
	if (!parsed.success) throw new Error("Ugyldig skjemadata");

	await db.insert(categories).values({
		householdId,
		name: parsed.data.name.trim(),
		type: parsed.data.type,
		isDefault: false,
	});

	revalidatePath("/settings/categories");
}

export async function renameCategory(formData: FormData) {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id);
	if (!householdId) throw new Error("No household found");

	const parsed = RenameCategorySchema.safeParse({
		id: formData.get("id"),
		name: formData.get("name"),
	});
	if (!parsed.success) throw new Error("Ugyldig skjemadata");

	await db
		.update(categories)
		.set({ name: parsed.data.name.trim() })
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
	const user = await verifySession();
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
