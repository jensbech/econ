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

const SavingsSchema = z.object({
	name: z.string().min(1, "Navn er påkrevd"),
	targetAmount: z.string().optional(),
	targetDate: z.string().optional(),
	accountId: z.string().optional(),
});

export async function createSavingsAccount(
	_prevState: SavingsFormState,
	formData: FormData,
): Promise<SavingsFormState> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const raw = {
		name: formData.get("name") as string,
		targetAmount: (formData.get("targetAmount") as string) || undefined,
		targetDate: (formData.get("targetDate") as string) || undefined,
		accountId: (formData.get("accountId") as string) || undefined,
	};

	const parsed = SavingsSchema.safeParse(raw);
	if (!parsed.success) {
		return { fieldErrors: extractFieldErrors(parsed.error) };
	}

	let targetOere: number | null = null;
	if (parsed.data.targetAmount) {
		try {
			targetOere = nokToOere(parsed.data.targetAmount);
			if (targetOere <= 0) {
				return { fieldErrors: { targetAmount: ["Beløp må være større enn 0"] } };
			}
		} catch {
			return { fieldErrors: { targetAmount: ["Ugyldig beløp"] } };
		}
	}

	await db.insert(savingsGoals).values({
		householdId,
		userId: user.id as string,
		name: parsed.data.name,
		targetOere,
		currentOere: 0,
		targetDate: parsed.data.targetDate || null,
		accountId: parsed.data.accountId || null,
	});

	revalidatePath("/savings");
	redirect("/savings");
}

// Keep old name as alias for backward compatibility
export const createSavingsGoal = createSavingsAccount;

export async function deleteSavingsAccount(id: string): Promise<void> {
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

// Keep old name as alias for backward compatibility
export const deleteSavingsGoal = deleteSavingsAccount;
