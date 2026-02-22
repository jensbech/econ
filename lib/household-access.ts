import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { householdMembers } from "@/db/schema";

/**
 * Verify that a user is a member of a household.
 * Throws an error if the user doesn't have access.
 */
export async function verifyHouseholdAccess(
	userId: string,
	householdId: string,
): Promise<void> {
	const [member] = await db
		.select({ id: householdMembers.id })
		.from(householdMembers)
		.where(
			and(
				eq(householdMembers.userId, userId),
				eq(householdMembers.householdId, householdId),
			),
		)
		.limit(1);

	if (!member) {
		throw new Error("Unauthorized: Not a member of this household");
	}
}

/**
 * Check if a user is a member of a household.
 * Returns true/false instead of throwing.
 */
export async function isHouseholdMember(
	userId: string,
	householdId: string,
): Promise<boolean> {
	const [member] = await db
		.select({ id: householdMembers.id })
		.from(householdMembers)
		.where(
			and(
				eq(householdMembers.userId, userId),
				eq(householdMembers.householdId, householdId),
			),
		)
		.limit(1);

	return !!member;
}
