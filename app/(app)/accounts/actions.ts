"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";

export async function createAccount(
	name: string,
	type: "public" | "private",
	icon: string = "wallet",
	accountNumber?: string,
): Promise<void> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	await db.insert(accounts).values({
		householdId,
		userId: user.id as string,
		name: name.trim(),
		type,
		icon,
		accountNumber: accountNumber?.trim() || null,
	});

	revalidatePath("/accounts");
}

export async function updateAccount(
	id: string,
	name: string,
	icon?: string,
	accountNumber?: string | null,
): Promise<void> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	const set: Record<string, string | null> = { name: name.trim() };
	if (icon) set.icon = icon;
	if (accountNumber !== undefined) set.accountNumber = accountNumber?.trim() || null;

	await db
		.update(accounts)
		.set(set)
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.householdId, householdId),
				eq(accounts.userId, user.id as string),
				isNull(accounts.deletedAt),
			),
		);

	revalidatePath("/accounts");
}

export async function deleteAccount(id: string): Promise<void> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	await db
		.update(accounts)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.householdId, householdId),
				eq(accounts.userId, user.id as string),
				isNull(accounts.deletedAt),
			),
		);

	revalidatePath("/accounts");
}
