import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, householdMembers, households, users } from "@/db/schema";
import { seedDefaultCategories } from "./default-categories";
import { checkRateLimit } from "./rate-limit";

export async function ensureUserAndHousehold(
	userId: string,
	email: string,
	name: string | null,
	image: string | null,
): Promise<string> {
	// Upsert user record — conflict on email so re-signing in never fails
	const [upsertedUser] = await db
		.insert(users)
		.values({ id: userId, email, name, image })
		.onConflictDoUpdate({
			target: users.email,
			set: { name, image },
		})
		.returning({ id: users.id });

	// Use the actual stored ID (may differ from the passed-in userId on conflict)
	userId = upsertedUser.id;

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
	const displayName = (name ?? email).slice(0, 100);
	const [household] = await db
		.insert(households)
		.values({ name: `${displayName}s husholdning` })
		.returning();

	// Use onConflictDoNothing to handle the race condition where two concurrent
	// sign-in requests both pass the membership check and try to create households
	const [member] = await db
		.insert(householdMembers)
		.values({ householdId: household.id, userId, role: "owner" })
		.onConflictDoNothing()
		.returning({ householdId: householdMembers.householdId });

	if (!member) {
		// Another concurrent request already created the household — return that one
		const [found] = await db
			.select({ householdId: householdMembers.householdId })
			.from(householdMembers)
			.where(eq(householdMembers.userId, userId))
			.limit(1);
		return found.householdId;
	}

	await seedDefaultCategories(household.id);

	// Create default public and private accounts for the new user
	await db.insert(accounts).values([
		{
			householdId: household.id,
			userId,
			name: "Felles",
			type: "public",
			icon: "landmark",
		},
		{
			householdId: household.id,
			userId,
			name: "Privat",
			type: "private",
			icon: "wallet",
		},
	]);

	return household.id;
}

export async function getHouseholdId(userId: string): Promise<string | null> {
	// Rate limit household lookups to prevent enumeration attacks
	try {
		checkRateLimit(`household:lookup:${userId}`, 100, 60);
	} catch (error) {
		// Log but don't expose to user; just fail silently for security
		console.warn(`Household lookup rate limit exceeded for user ${userId}`);
		throw new Error("Service temporarily unavailable");
	}

	const result = await db
		.select({ householdId: householdMembers.householdId })
		.from(householdMembers)
		.where(eq(householdMembers.userId, userId))
		.limit(1);

	return result[0]?.householdId ?? null;
}
