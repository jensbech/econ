"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { categories, expenses, importBatches } from "@/db/schema";
import {
	type AiExtractionResult,
	type SupportedMediaType,
	extractTransactions,
} from "@/lib/ai-extract";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { parseDateToIso } from "@/lib/server-utils";

export async function startAiExtraction(
	base64: string,
	mediaType: SupportedMediaType,
): Promise<AiExtractionResult> {
	return extractTransactions(base64, mediaType);
}

// ─── AI import ────────────────────────────────────────────────────────────────

export interface AiImportRow {
	date: string; // dd.mm.yyyy or yyyy-mm-dd
	amountOere: number; // in øre (positive integer)
	description: string;
	categoryId: string | null;
}

/**
 * Create an import batch and bulk-insert AI-extracted transactions as expenses.
 */
export async function confirmAiImport(
	filename: string,
	rows: AiImportRow[],
): Promise<{ batchId: string; inserted: number }> {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	const parsed = rows
		.map((row) => ({
			isoDate: parseDateToIso(row.date),
			amountOere: Math.round(row.amountOere),
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
			} =>
				r.isoDate !== null &&
				Number.isFinite(r.amountOere) &&
				r.amountOere >= 0,
		);

	if (parsed.length === 0) return { batchId: "", inserted: 0 };

	// Validate all supplied category IDs belong to this household
	const suppliedCategoryIds = [
		...new Set(
			parsed.map((r) => r.categoryId).filter((id): id is string => id !== null),
		),
	];
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
		const validCategoryIds = new Set(validCats.map((c) => c.id));
		for (const r of parsed) {
			if (r.categoryId !== null && !validCategoryIds.has(r.categoryId)) {
				r.categoryId = null;
			}
		}
	}

	const [batch] = await db
		.insert(importBatches)
		.values({
			householdId,
			userId: user.id as string,
			filename,
			rowCount: parsed.length,
		})
		.returning({ id: importBatches.id });

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
