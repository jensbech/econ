import { db } from "@/db";
import { auditLog } from "@/db/schema";

export interface AuditLogEntry {
	householdId: string;
	userId: string;
	action: string; // 'create', 'update', 'delete', etc.
	resourceType: string; // 'expense', 'income', 'account', etc.
	resourceId: string;
	changes?: Record<string, any>;
}

/**
 * Log an audit event for financial data changes.
 * This creates a permanent record of who did what and when.
 */
const REDACTED_FIELDS = new Set(["accountNumber", "accountNumberEncrypted"]);

function sanitizeChanges(changes: Record<string, any>): Record<string, any> {
	const result: Record<string, any> = {};
	for (const [key, value] of Object.entries(changes)) {
		if (REDACTED_FIELDS.has(key) && typeof value === "string" && value.length > 0) {
			result[key] = `***${value.slice(-4)}`;
		} else {
			result[key] = value;
		}
	}
	return result;
}

export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
	const sanitized = entry.changes ? sanitizeChanges(entry.changes) : undefined;
	await db.insert(auditLog).values({
		householdId: entry.householdId,
		userId: entry.userId,
		action: entry.action,
		resourceType: entry.resourceType,
		resourceId: entry.resourceId,
		changes: sanitized ? JSON.stringify(sanitized) : null,
		timestamp: new Date(),
	});
}

/**
 * Convenience function to log a create event.
 */
export async function logCreate(
	householdId: string,
	userId: string,
	resourceType: string,
	resourceId: string,
	data: Record<string, any>,
): Promise<void> {
	await logAuditEvent({
		householdId,
		userId,
		action: "create",
		resourceType,
		resourceId,
		changes: data,
	});
}

/**
 * Convenience function to log an update event.
 */
export async function logUpdate(
	householdId: string,
	userId: string,
	resourceType: string,
	resourceId: string,
	changes: Record<string, any>,
): Promise<void> {
	await logAuditEvent({
		householdId,
		userId,
		action: "update",
		resourceType,
		resourceId,
		changes,
	});
}

/**
 * Convenience function to log a delete event.
 */
export async function logDelete(
	householdId: string,
	userId: string,
	resourceType: string,
	resourceId: string,
	reason?: string | Record<string, any>,
): Promise<void> {
	let changes: Record<string, any> | undefined;
	if (reason) {
		if (typeof reason === "string") {
			changes = { reason };
		} else {
			changes = reason;
		}
	}

	await logAuditEvent({
		householdId,
		userId,
		action: "delete",
		resourceType,
		resourceId,
		changes,
	});
}
