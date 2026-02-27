"use server";

import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
	accounts,
	categories,
	expenses,
	importBatches,
	loans,
} from "@/db/schema";
import { logCreate, logDelete } from "@/lib/audit";
import { validateCsrfOrigin } from "@/lib/csrf-validate";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseDateToIso } from "@/lib/server-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnrichedTransaction {
	date: string;
	amountOere: number;
	description: string;
	categoryId: string | null;
	categorySource: "history" | "ai" | "none";
	suggestedNewCategory: string | null;
	aiConfidence: "high" | "medium" | "low";
	accountNumber: string | null;
	accountId: string | null;
}

export type EnrichedExtractionResult =
	| { success: true; transactions: EnrichedTransaction[] }
	| { success: false; error: string };

// ─── Duplicate check for AI-extracted rows ────────────────────────────────────

export async function checkAiDuplicates(
	rows: Array<{ date: string; amountOere: number }>,
): Promise<boolean[]> {
	await validateCsrfOrigin();
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return rows.map(() => false);

	const isoDates = rows
		.map((r) => parseDateToIso(r.date))
		.filter((d): d is string => d !== null);

	if (isoDates.length === 0) return rows.map(() => false);

	const existing = await db
		.select({ date: expenses.date, amountOere: expenses.amountOere })
		.from(expenses)
		.where(
			and(
				eq(expenses.householdId, householdId),
				isNull(expenses.deletedAt),
				inArray(expenses.date, isoDates),
			),
		);

	return rows.map((row) => {
		const isoDate = parseDateToIso(row.date);
		if (!isoDate) return false;
		return existing.some(
			(e) => e.date === isoDate && e.amountOere === row.amountOere,
		);
	});
}

// ─── Create category inline ───────────────────────────────────────────────────

export async function createExpenseCategory(
	name: string,
): Promise<{ id: string; name: string }> {
	await validateCsrfOrigin();
	const user = await verifySession();
	checkRateLimit(`category:create:${user.id}`, 20, 60);
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	const normalizedName = name.normalize("NFKC").trim().slice(0, 100);
	if (!normalizedName || /[\x00-\x1f\x7f-\x9f]/.test(normalizedName)) {
		throw new Error("Ugyldig kategorinavn");
	}

	// Enforce category count cap (HIGH-08)
	const [{ cnt }] = await db
		.select({ cnt: sql<number>`count(*)::int` })
		.from(categories)
		.where(
			and(
				eq(categories.householdId, householdId),
				isNull(categories.deletedAt),
			),
		);
	if (cnt >= 200) throw new Error("Maks 200 kategorier per husholdning");

	const [cat] = await db
		.insert(categories)
		.values({ householdId, name: normalizedName, type: "expense" })
		.returning({ id: categories.id, name: categories.name });

	await logCreate(householdId, user.id as string, "category", cat.id, { source: "ai-import" });

	revalidatePath("/import");
	revalidatePath("/settings/categories");
	return cat;
}

// ─── AI import ────────────────────────────────────────────────────────────────

export interface AiImportRow {
	date: string;
	amountOere: number;
	description: string;
	categoryId: string | null;
	accountId?: string | null;
	loanId?: string | null;
	interestOere?: number | null;
	principalOere?: number | null;
}

export async function confirmAiImport(
	filename: string,
	rows: AiImportRow[],
	accountId: string | null = null,
	scope: "household" | "personal" = "household",
	isShared = false,
): Promise<{ batchId: string; inserted: number }> {
	await validateCsrfOrigin();
	const user = await verifySession();
	checkRateLimit(`ai:import:${user.id}`, 5, 3600);
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	const safeFilename = filename
		.trim()
		.slice(0, 255)
		.replace(/[\x00-\x1f\x7f]/g, "");
	if (!safeFilename) throw new Error("Ugyldig filnavn");

	if (scope !== "household" && scope !== "personal")
		throw new Error("Ugyldig scope");

	const MAX_IMPORT_ROWS = 500;
	if (rows.length > MAX_IMPORT_ROWS)
		throw new Error(`Maks ${MAX_IMPORT_ROWS} rader per import`);

	const parsed = rows
		.map((row) => ({
			isoDate: parseDateToIso(row.date),
			amountOere: Math.round(row.amountOere),
			description: row.description.trim().slice(0, 500),
			categoryId: row.categoryId || null,
			accountId: row.accountId ?? accountId ?? null,
			loanId: row.loanId || null,
			interestOere:
				Number.isFinite(row.interestOere) && (row.interestOere ?? -1) >= 0
					? Math.round(row.interestOere as number)
					: null,
			principalOere:
				Number.isFinite(row.principalOere) && (row.principalOere ?? -1) >= 0
					? Math.round(row.principalOere as number)
					: null,
		}))
		.filter(
			(
				r,
			): r is {
				isoDate: string;
				amountOere: number;
				description: string;
				categoryId: string | null;
				accountId: string | null;
				loanId: string | null;
				interestOere: number | null;
				principalOere: number | null;
			} =>
				r.isoDate !== null &&
				Number.isFinite(r.amountOere) &&
				r.amountOere >= 0 &&
				r.amountOere <= 2_000_000_000,
		);

	if (parsed.length === 0) return { batchId: "", inserted: 0 };

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

	// Validate accountId and loanId ownership (CRIT-02)
	const allAccountIds = [
		...new Set(
			[accountId, ...parsed.map((r) => r.accountId)].filter(
				(id): id is string => id !== null,
			),
		),
	];
	const validAccountIds = new Set<string>();
	if (allAccountIds.length > 0) {
		const validAccts = await db
			.select({ id: accounts.id })
			.from(accounts)
			.where(
				and(
					inArray(accounts.id, allAccountIds),
					eq(accounts.householdId, householdId),
					isNull(accounts.deletedAt),
				),
			);
		for (const a of validAccts) validAccountIds.add(a.id);
	}

	const allLoanIds = [
		...new Set(
			parsed.map((r) => r.loanId).filter((id): id is string => id !== null),
		),
	];
	const validLoanIds = new Set<string>();
	if (allLoanIds.length > 0) {
		const validLoans = await db
			.select({ id: loans.id })
			.from(loans)
			.where(
				and(
					inArray(loans.id, allLoanIds),
					eq(loans.householdId, householdId),
					isNull(loans.deletedAt),
				),
			);
		for (const l of validLoans) validLoanIds.add(l.id);
	}

	const safeTopLevelAccountId =
		accountId && validAccountIds.has(accountId) ? accountId : null;
	for (const r of parsed) {
		if (r.accountId !== null && !validAccountIds.has(r.accountId)) {
			r.accountId = null;
		}
		if (r.loanId !== null && !validLoanIds.has(r.loanId)) {
			r.loanId = null;
		}
	}

	const [batch] = await db
		.insert(importBatches)
		.values({
			householdId,
			userId: user.id as string,
			filename: safeFilename,
			rowCount: parsed.length,
			scope,
			accountId: safeTopLevelAccountId,
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
			scope,
			isShared: scope === "personal" ? isShared : false,
			accountId: r.accountId || null,
			loanId: r.loanId || null,
			interestOere: r.interestOere ?? null,
			principalOere: r.principalOere ?? null,
		})),
	);

	await logCreate(householdId, user.id as string, "importBatch", batch.id, {
		filename: safeFilename,
		rowCount: parsed.length,
		scope,
		source: "ai",
	});

	revalidatePath("/import");
	revalidatePath("/expenses");
	revalidatePath("/savings");
	revalidatePath("/loans");

	return { batchId: batch.id, inserted: parsed.length };
}
