"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { checkRateLimit } from "@/lib/rate-limit";
import { logCreate, logUpdate, logDelete } from "@/lib/audit";
import { validateCsrfOrigin } from "@/lib/csrf-validate";

export async function createAccount(
	name: string,
	type: "public" | "private",
	icon: string = "wallet",
	accountNumber?: string,
	kind: string = "checking",
): Promise<void> {
	// CSRF protection
	await validateCsrfOrigin();

	const user = await verifySession();
	if (!user.id) throw new Error("User ID not available");

	// Rate limiting: max 5 accounts per minute per user
	checkRateLimit(`account:create:${user.id}`, 5, 60);

	const householdId = await getHouseholdId(user.id);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	const trimmedAccountNumber = accountNumber?.trim() || null;

	// Validate account number format if provided (Norwegian format: XXXX.XX.XXXXX)
	if (trimmedAccountNumber && !/^\d{4}\.\d{2}\.\d{5}$/.test(trimmedAccountNumber)) {
		throw new Error(
			"Kontonummer må være på formatet XXXX.XX.XXXXX (f.eks. 1234.56.78901)",
		);
	}

	const [inserted] = await db
		.insert(accounts)
		.values({
			householdId,
			userId: user.id,
			name: name.trim(),
			type,
			kind,
			icon,
			accountNumber: trimmedAccountNumber,
		})
		.returning({ id: accounts.id });

	// Log the account creation
	await logCreate(householdId, user.id, "account", inserted.id, {
		name: name.trim(),
		type,
		kind,
		icon,
	});

	revalidatePath("/accounts");
}

export async function updateAccount(
	id: string,
	name: string,
	icon?: string,
	accountNumber?: string | null,
	kind?: string,
): Promise<void> {
	// CSRF protection
	await validateCsrfOrigin();

	const user = await verifySession();
	if (!user.id) throw new Error("User ID not available");

	// Rate limiting: max 10 updates per minute per user
	checkRateLimit(`account:update:${user.id}`, 10, 60);

	const householdId = await getHouseholdId(user.id);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	// AUTHORIZATION: Verify account exists and belongs to the user
	const [account] = await db
		.select({ id: accounts.id })
		.from(accounts)
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.householdId, householdId),
				eq(accounts.userId, user.id),
				isNull(accounts.deletedAt),
			),
		)
		.limit(1);

	if (!account) {
		throw new Error("Account not found or access denied");
	}

	const trimmedAccountNumber = accountNumber?.trim() || null;

	// Validate account number format if provided
	if (trimmedAccountNumber && !/^\d{4}\.\d{2}\.\d{5}$/.test(trimmedAccountNumber)) {
		throw new Error(
			"Kontonummer må være på formatet XXXX.XX.XXXXX (f.eks. 1234.56.78901)",
		);
	}

	const set: Record<string, string | null> = { name: name.trim() };
	if (icon) set.icon = icon;
	if (accountNumber !== undefined) set.accountNumber = trimmedAccountNumber;
	if (kind) set.kind = kind;

	await db
		.update(accounts)
		.set(set)
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.householdId, householdId),
				eq(accounts.userId, user.id),
			),
		);

	// Log the update
	await logUpdate(householdId, user.id, "account", id, set);

	revalidatePath("/accounts");
}

export async function deleteAccount(id: string): Promise<void> {
	// CSRF protection
	await validateCsrfOrigin();

	const user = await verifySession();
	if (!user.id) throw new Error("User ID not available");

	// Rate limiting: max 5 deletes per minute per user
	checkRateLimit(`account:delete:${user.id}`, 5, 60);

	const householdId = await getHouseholdId(user.id);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	// AUTHORIZATION: Verify account exists and belongs to the user
	const [account] = await db
		.select({ id: accounts.id })
		.from(accounts)
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.householdId, householdId),
				eq(accounts.userId, user.id),
				isNull(accounts.deletedAt),
			),
		)
		.limit(1);

	if (!account) {
		throw new Error("Account not found or access denied");
	}

	await db
		.update(accounts)
		.set({ deletedAt: new Date() })
		.where(eq(accounts.id, id));

	// Log the deletion
	await logDelete(householdId, user.id, "account", id, "User initiated deletion");

	revalidatePath("/accounts");
}
