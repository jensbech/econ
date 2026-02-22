import { isNull, type SQL } from "drizzle-orm";

/**
 * Helper to create a "not deleted" filter for soft-deleted records.
 * Use this to ensure you always exclude deleted records in queries.
 *
 * Example:
 *   .where(and(eq(users.id, id), notDeleted(users.deletedAt)))
 */
export function notDeleted(deletedAtColumn: any): SQL {
	return isNull(deletedAtColumn);
}

/**
 * Reminder: Always use this pattern when querying to avoid including deleted records:
 *   const [result] = await db
 *     .select()
 *     .from(expenses)
 *     .where(and(eq(expenses.id, id), notDeleted(expenses.deletedAt)))
 *
 * Or even simpler, import and use: isNull(expenses.deletedAt)
 */
