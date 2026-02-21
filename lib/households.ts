import { eq } from "drizzle-orm";
import { db } from "@/db";
import { householdMembers, households, users } from "@/db/schema";
import { seedDefaultCategories } from "./default-categories";

export async function ensureUserAndHousehold(
	userId: string,
	email: string,
	name: string | null,
	image: string | null,
): Promise<string> {
	// Upsert user record
	await db
		.insert(users)
		.values({ id: userId, email, name, image })
		.onConflictDoUpdate({
			target: users.id,
			set: { name, image },
		});

	// Return existing household if one exists
	const existing = await db
		.select({ householdId: householdMembers.householdId })
		.from(householdMembers)
		.where(eq(householdMembers.userId, userId))
		.limit(1);

	if (existing.length > 0) {
		return existing[0].householdId;
	}

	// Create personal household for new user
	const [household] = await db
		.insert(households)
		.values({ name: `${name ?? email}s husholdning` })
		.returning();

	await db.insert(householdMembers).values({
		householdId: household.id,
		userId,
		role: "owner",
	});

	await seedDefaultCategories(household.id);

	return household.id;
}

export async function getHouseholdId(userId: string): Promise<string | null> {
	const result = await db
		.select({ householdId: householdMembers.householdId })
		.from(householdMembers)
		.where(eq(householdMembers.userId, userId))
		.limit(1);

	return result[0]?.householdId ?? null;
}
