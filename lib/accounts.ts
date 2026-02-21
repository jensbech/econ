import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";

export type Account = {
	id: string;
	name: string;
	accountNumber: string | null;
	type: string;
	icon: string;
	userId: string;
};

export async function getVisibleAccounts(
	userId: string,
	householdId: string,
): Promise<Account[]> {
	return db
		.select({
			id: accounts.id,
			name: accounts.name,
			accountNumber: accounts.accountNumber,
			type: accounts.type,
			icon: accounts.icon,
			userId: accounts.userId,
		})
		.from(accounts)
		.where(
			and(
				eq(accounts.householdId, householdId),
				isNull(accounts.deletedAt),
				or(
					eq(accounts.type, "public"),
					eq(accounts.userId, userId),
				),
			),
		)
		.orderBy(accounts.createdAt);
}

/**
 * Returns the account IDs to use for filtering queries.
 * Empty selection = all PUBLIC accounts (private excluded by default).
 * Explicit selection = exactly those accounts (may include private).
 */
export async function getFilteredAccountIds(
	userId: string,
	householdId: string,
	selectedIds: string[],
): Promise<string[]> {
	const visible = await getVisibleAccounts(userId, householdId);
	if (selectedIds.length === 0) {
		return visible.filter((a) => a.type === "public").map((a) => a.id);
	}
	return visible.filter((a) => selectedIds.includes(a.id)).map((a) => a.id);
}

export async function assertAccountAccess(
	accountId: string,
	userId: string,
	householdId: string,
): Promise<void> {
	const visible = await getVisibleAccounts(userId, householdId);
	const found = visible.find((a) => a.id === accountId);
	if (!found) {
		throw new Error("Ingen tilgang til denne kontoen");
	}
}
