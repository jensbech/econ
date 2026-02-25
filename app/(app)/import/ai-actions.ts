"use server";

import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, categories, expenses, importBatches, loans } from "@/db/schema";
import { type SupportedMediaType, extractTransactions } from "@/lib/ai-extract";
import { logCreate, logDelete } from "@/lib/audit";
import { validateCsrfOrigin } from "@/lib/csrf-validate";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseDateToIso } from "@/lib/server-utils";

const ALLOWED_FILE_HOSTS = [".utfs.io", ".uploadthing.com"];
const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
];

function isAllowedFileUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "https:") return false;
		return ALLOWED_FILE_HOSTS.some(
			(host) =>
				parsed.hostname === host.replace(/^\./, "") ||
				parsed.hostname.endsWith(host),
		);
	} catch {
		return false;
	}
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findBestHistoryCategory(
	description: string,
	history: Array<{ notes: string | null; categoryId: string | null }>,
): string | null {
	const normalDesc = description.toLowerCase().trim();
	const tokens = normalDesc.split(/[\s\W]+/).filter((t) => t.length > 3);
	if (tokens.length === 0) return null;

	const counts: Record<string, number> = {};
	for (const { notes, categoryId } of history) {
		if (!notes || !categoryId) continue;
		const normalNotes = notes.toLowerCase().trim();
		const hasMatch =
			tokens.some((t) => normalNotes.includes(t)) ||
			normalNotes.includes(normalDesc) ||
			normalDesc.includes(normalNotes);
		if (hasMatch) {
			counts[categoryId] = (counts[categoryId] ?? 0) + 1;
		}
	}

	const top = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
	return top?.[0] ?? null;
}

function findCategoryInDb(
	name: string,
	dbCategories: Array<{ id: string; name: string }>,
): string | null {
	if (!name) return null;
	const lower = name.toLowerCase().trim();
	return (
		dbCategories.find((c) => c.name.toLowerCase() === lower)?.id ??
		dbCategories.find((c) => {
			const cLower = c.name.toLowerCase();
			return cLower.includes(lower) || lower.includes(cLower);
		})?.id ??
		null
	);
}

// ─── AI extraction + enrichment ───────────────────────────────────────────────

export async function startAiExtraction(
	fileUrl: string,
	mediaType: SupportedMediaType,
	userAccounts: Array<{ id: string; accountNumber: string | null }> = [],
): Promise<EnrichedExtractionResult> {
	await validateCsrfOrigin();
	const user = await verifySession();

	checkRateLimit(`ai:extract:${user.id}`, 10, 600);

	if (!isAllowedFileUrl(fileUrl)) {
		return { success: false, error: "Ugyldig filkilde." };
	}

	if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
		return { success: false, error: "Ustøttet filformat." };
	}

	const fileResponse = await fetch(fileUrl);
	if (!fileResponse.ok) {
		return { success: false, error: "Klarte ikke hente filen. Prøv igjen." };
	}
	const buffer = await fileResponse.arrayBuffer();
	const base64 = Buffer.from(buffer).toString("base64");

	const householdId = await getHouseholdId(user.id as string);

	// Build account number → id lookup
	const accountNumberMap = new Map<string, string>();
	for (const a of userAccounts) {
		if (a.accountNumber) {
			accountNumberMap.set(a.accountNumber.replace(/[\s.]/g, ""), a.id);
		}
	}

	function matchAccountId(extractedNumber: string | null): string | null {
		if (!extractedNumber) return null;
		const normalized = extractedNumber.replace(/[\s.]/g, "");
		return accountNumberMap.get(normalized) ?? null;
	}

	// No household — extract without category names
	if (!householdId) {
		const raw = await extractTransactions(base64, mediaType);
		if (!raw.success) return raw;
		return {
			success: true,
			transactions: raw.transactions.map((tx) => ({
				date: tx.date,
				amountOere: tx.amountOere,
				description: tx.description,
				categoryId: null,
				categorySource: "none",
				suggestedNewCategory: tx.suggestedCategory || null,
				aiConfidence: tx.confidence,
				accountNumber: tx.accountNumber ?? null,
				accountId: matchAccountId(tx.accountNumber ?? null),
			})),
		};
	}

	// Fetch DB categories and expense history in parallel
	const [dbCategories, history] = await Promise.all([
		db
			.select({ id: categories.id, name: categories.name })
			.from(categories)
			.where(
				and(
					eq(categories.householdId, householdId),
					isNull(categories.deletedAt),
				),
			),
		db
			.select({ notes: expenses.notes, categoryId: expenses.categoryId })
			.from(expenses)
			.where(
				and(
					eq(expenses.householdId, householdId),
					isNull(expenses.deletedAt),
					isNotNull(expenses.notes),
					isNotNull(expenses.categoryId),
				),
			),
	]);

	const categoryNames = dbCategories.map((c) => c.name);
	const raw = await extractTransactions(base64, mediaType, categoryNames);
	if (!raw.success) return raw;

	const enriched: EnrichedTransaction[] = raw.transactions.map((tx) => {
		const txAccountNumber = tx.accountNumber ?? null;
		const txAccountId = matchAccountId(txAccountNumber);

		// 1. History match — seen this merchant before
		const historyMatch = findBestHistoryCategory(tx.description, history);
		if (historyMatch) {
			return {
				date: tx.date,
				amountOere: tx.amountOere,
				description: tx.description,
				categoryId: historyMatch,
				categorySource: "history",
				suggestedNewCategory: null,
				aiConfidence: tx.confidence,
				accountNumber: txAccountNumber,
				accountId: txAccountId,
			};
		}

		// 2. AI suggestion matches an existing DB category
		const aiMatch = findCategoryInDb(tx.suggestedCategory, dbCategories);
		if (aiMatch) {
			return {
				date: tx.date,
				amountOere: tx.amountOere,
				description: tx.description,
				categoryId: aiMatch,
				categorySource: "ai",
				suggestedNewCategory: null,
				aiConfidence: tx.confidence,
				accountNumber: txAccountNumber,
				accountId: txAccountId,
			};
		}

		// 3. AI suggested a new category that doesn't exist yet
		const suggestedNew =
			tx.suggestedCategory && tx.suggestedCategory !== "Annet"
				? tx.suggestedCategory
				: null;
		return {
			date: tx.date,
			amountOere: tx.amountOere,
			description: tx.description,
			categoryId: null,
			categorySource: "none",
			suggestedNewCategory: suggestedNew,
			aiConfidence: tx.confidence,
			accountNumber: txAccountNumber,
			accountId: txAccountId,
		};
	});

	return { success: true, transactions: enriched };
}

// ─── Duplicate check for AI-extracted rows ────────────────────────────────────

export async function checkAiDuplicates(
	rows: Array<{ date: string; amountOere: number }>,
): Promise<boolean[]> {
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

	const trimmedName = name.trim().slice(0, 100);
	if (!trimmedName || /[\x00-\x1f\x7f-\x9f]/.test(trimmedName)) {
		throw new Error("Ugyldig kategorinavn");
	}

	// Enforce category count cap (HIGH-08)
	const [{ cnt }] = await db
		.select({ cnt: sql<number>`count(*)::int` })
		.from(categories)
		.where(and(eq(categories.householdId, householdId), isNull(categories.deletedAt)));
	if (cnt >= 200) throw new Error("Maks 200 kategorier per husholdning");

	const [cat] = await db
		.insert(categories)
		.values({ householdId, name: trimmedName, type: "expense" })
		.returning({ id: categories.id, name: categories.name });

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

	const safeFilename = filename.trim().slice(0, 255).replace(/[\x00-\x1f\x7f]/g, "");
	if (!safeFilename) throw new Error("Ugyldig filnavn");

	if (scope !== "household" && scope !== "personal") throw new Error("Ugyldig scope");

	const MAX_IMPORT_ROWS = 500;
	if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Maks ${MAX_IMPORT_ROWS} rader per import`);

	const parsed = rows
		.map((row) => ({
			isoDate: parseDateToIso(row.date),
			amountOere: Math.round(row.amountOere),
			description: row.description.trim().slice(0, 500),
			categoryId: row.categoryId || null,
			accountId: row.accountId ?? accountId ?? null,
			loanId: row.loanId || null,
			interestOere: Number.isFinite(row.interestOere) && (row.interestOere ?? -1) >= 0
				? Math.round(row.interestOere as number)
				: null,
			principalOere: Number.isFinite(row.principalOere) && (row.principalOere ?? -1) >= 0
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
