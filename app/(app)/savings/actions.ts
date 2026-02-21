"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { extractFieldErrors, nokToOere } from "@/lib/server-utils";

export type SavingsFormState = {
	error?: string | null;
	fieldErrors?: Record<string, string[]>;
} | null;

export type ProgressFormState = {
	error?: string | null;
	fieldErrors?: Record<string, string[]>;
} | null;

const SavingsSchema = z.object({
	name: z.string().min(1, "Navn er påkrevd"),
	targetAmount: z.string().min(1, "Målbeløp er påkrevd"),
	targetDate: z.string().optional(),
});

const ProgressSchema = z.object({
	amount: z.string().min(1, "Beløp er påkrevd"),
	mode: z.enum(["set", "increment"]),
});

export async function createSavingsGoal(
	_prevState: SavingsFormState,
	formData: FormData,
): Promise<SavingsFormState> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const raw = {
		name: formData.get("name") as string,
		targetAmount: formData.get("targetAmount") as string,
		targetDate: (formData.get("targetDate") as string) || undefined,
	};

	const parsed = SavingsSchema.safeParse(raw);
	if (!parsed.success) {
		return { fieldErrors: extractFieldErrors(parsed.error) };
	}

	let targetOere: number;
	try {
		targetOere = nokToOere(parsed.data.targetAmount);
	} catch {
		return { fieldErrors: { targetAmount: ["Ugyldig beløp"] } };
	}

	if (targetOere <= 0) {
		return { fieldErrors: { targetAmount: ["Beløp må være større enn 0"] } };
	}

	await db.insert(savingsGoals).values({
		householdId,
		userId: user.id as string,
		name: parsed.data.name,
		targetOere,
		currentOere: 0,
		targetDate: parsed.data.targetDate || null,
	});

	revalidatePath("/savings");
	redirect("/savings");
}

export async function deleteSavingsGoal(id: string): Promise<void> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	await db
		.update(savingsGoals)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(savingsGoals.id, id),
				eq(savingsGoals.householdId, householdId),
				isNull(savingsGoals.deletedAt),
			),
		);

	revalidatePath("/savings");
}

export async function updateProgress(
	goalId: string,
	_prevState: ProgressFormState,
	formData: FormData,
): Promise<ProgressFormState> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	// Verify goal belongs to this household
	const [goal] = await db
		.select({ id: savingsGoals.id, currentOere: savingsGoals.currentOere })
		.from(savingsGoals)
		.where(
			and(
				eq(savingsGoals.id, goalId),
				eq(savingsGoals.householdId, householdId),
				isNull(savingsGoals.deletedAt),
			),
		)
		.limit(1);

	if (!goal) return { error: "Sparemål ikke funnet" };

	const raw = {
		amount: formData.get("amount") as string,
		mode: formData.get("mode") as string,
	};

	const parsed = ProgressSchema.safeParse(raw);
	if (!parsed.success) {
		return { fieldErrors: extractFieldErrors(parsed.error) };
	}

	let amountOere: number;
	try {
		amountOere = nokToOere(parsed.data.amount);
	} catch {
		return { fieldErrors: { amount: ["Ugyldig beløp"] } };
	}

	const newCurrentOere =
		parsed.data.mode === "set" ? amountOere : goal.currentOere + amountOere;

	await db
		.update(savingsGoals)
		.set({ currentOere: Math.max(0, newCurrentOere) })
		.where(
			and(
				eq(savingsGoals.id, goalId),
				eq(savingsGoals.householdId, householdId),
				isNull(savingsGoals.deletedAt),
			),
		);

	revalidatePath("/savings");
	return null;
}
