"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories, expenses, importBatches } from "@/db/schema";
import type { DecimalSeparator } from "@/lib/csv-detect";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { parseDateToIso } from "@/lib/server-utils";

export interface CheckRow {
	date: string;
	amount: string;
	description: string;
}

export interface ImportRow extends CheckRow {
	categoryId: string | null;
}

function parseAmountToOere(
	amountStr: string,
	decimalSeparator: DecimalSeparator,
): number | null {
	let cleaned = amountStr.trim().replace(/\s/g, "");
	if (decimalSeparator === ",") {
		// European format: "1.234,56" — period is thousands sep, comma is decimal
		cleaned = cleaned.replace(/\./g, "").replace(",", ".");
	} else {
		// Anglo format: "1,234.56" — comma is thousands sep, period is decimal
		cleaned = cleaned.replace(/,/g, "");
	}
	const value = Number.parseFloat(cleaned);
	if (Number.isNaN(value)) return null;
	// Store as positive øre (expenses are stored as positive integers)
	return Math.round(Math.abs(value) * 100);
}

// ─── Server actions ───────────────────────────────────────────────────────────

/**
 * For each candidate row, check whether a matching expense already exists
 * in the household (date = row.date AND amountOere = row.amountOere AND
 * notes ILIKE row.description).
 *
 * Returns a parallel boolean array: true = probable duplicate.
 */
export async function checkDuplicates(
	rows: CheckRow[],
	decimalSeparator: DecimalSeparator,
): Promise<boolean[]> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return rows.map(() => false);

	// Parse all rows to canonical form
	const parsed = rows.map((row) => ({
		isoDate: parseDateToIso(row.date),
		amountOere: parseAmountToOere(row.amount, decimalSeparator),
		description: row.description.trim().toLowerCase(),
	}));

	// Collect unique valid dates for a single batch DB query
	const uniqueDates = [
		...new Set(
			parsed.filter((r) => r.isoDate !== null).map((r) => r.isoDate as string),
		),
	];

	if (uniqueDates.length === 0) return rows.map(() => false);

	// Fetch all non-deleted expenses on those dates
	const existing = await db
		.select({
			date: expenses.date,
			amountOere: expenses.amountOere,
			notes: expenses.notes,
		})
		.from(expenses)
		.where(
			and(
				eq(expenses.householdId, householdId),
				inArray(expenses.date, uniqueDates),
				isNull(expenses.deletedAt),
			),
		);

	// In-memory match: date + amount + description (case-insensitive)
	return parsed.map((row) => {
		if (row.isoDate === null || row.amountOere === null) return false;
		return existing.some(
			(e) =>
				e.date === row.isoDate &&
				e.amountOere === row.amountOere &&
				(e.notes ?? "").toLowerCase() === row.description,
		);
	});
}

/**
 * Create an import batch record and bulk-insert all provided rows as expenses.
 * Returns the batch ID and inserted row count.
 */
export async function confirmImport(
	filename: string,
	rows: ImportRow[],
	decimalSeparator: DecimalSeparator,
): Promise<{ batchId: string; inserted: number }> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	// Parse and filter out unparseable rows
	const parsed = rows
		.map((row) => ({
			isoDate: parseDateToIso(row.date),
			amountOere: parseAmountToOere(row.amount, decimalSeparator),
			description: row.description.trim(),
			categoryId: row.categoryId || null,
		}))
		.filter(
			(
				r,
			): r is {
				isoDate: string;
				amountOere: number;
				description: string;
				categoryId: string | null;
			} => r.isoDate !== null && r.amountOere !== null,
		);

	if (parsed.length === 0) return { batchId: "", inserted: 0 };

	// Validate all supplied category IDs belong to this household
	const suppliedCategoryIds = [
		...new Set(
			parsed.map((r) => r.categoryId).filter((id): id is string => id !== null),
		),
	];
	const validCategoryIds = new Set<string>();
	if (suppliedCategoryIds.length > 0) {
		const validCats = await db
			.select({ id: categories.id })
			.from(categories)
			.where(
				and(
					inArray(categories.id, suppliedCategoryIds),
					eq(categories.householdId, householdId),
					isNull(categories.deletedAt),
				),
			);
		for (const c of validCats) validCategoryIds.add(c.id);
		// Nullify any category IDs that don't belong to this household
		for (const r of parsed) {
			if (r.categoryId !== null && !validCategoryIds.has(r.categoryId)) {
				r.categoryId = null;
			}
		}
	}

	// Create the import batch record
	const [batch] = await db
		.insert(importBatches)
		.values({
			householdId,
			userId: user.id as string,
			filename,
			rowCount: parsed.length,
		})
		.returning({ id: importBatches.id });

	// Bulk-insert all rows linked to this batch
	await db.insert(expenses).values(
		parsed.map((r) => ({
			householdId,
			userId: user.id as string,
			categoryId: r.categoryId,
			amountOere: r.amountOere,
			date: r.isoDate,
			notes: r.description || null,
			importBatchId: batch.id,
		})),
	);

	revalidatePath("/import");
	revalidatePath("/expenses");

	return { batchId: batch.id, inserted: parsed.length };
}

/**
 * Soft-delete all expenses in a given import batch and mark the batch as
 * rolled back.
 */
export async function rollbackImport(batchId: string): Promise<void> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	await db
		.update(importBatches)
		.set({ rolledBackAt: new Date() })
		.where(
			and(
				eq(importBatches.id, batchId),
				eq(importBatches.householdId, householdId),
			),
		);

	await db
		.update(expenses)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(expenses.importBatchId, batchId),
				eq(expenses.householdId, householdId),
				isNull(expenses.deletedAt),
			),
		);

	revalidatePath("/import");
	revalidatePath("/expenses");
}
