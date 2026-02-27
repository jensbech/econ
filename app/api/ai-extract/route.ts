import { and, eq, isNotNull, isNull } from "drizzle-orm";
import type {
	EnrichedExtractionResult,
	EnrichedTransaction,
} from "@/app/(app)/import/ai-actions";
import { db } from "@/db";
import { accounts, categories, expenses } from "@/db/schema";
import { extractTransactions, type SupportedMediaType } from "@/lib/ai-extract";
import { validateCsrfOrigin } from "@/lib/csrf-validate";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const SUPPORTED_MEDIA_TYPES: SupportedMediaType[] = [
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
];

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

export async function POST(request: Request) {
	try {
		await validateCsrfOrigin();
		const user = await verifySession();
		checkRateLimit(`ai:extract:${user.id}`, 5, 3600);

		const formData = await request.formData();
		const file = formData.get("file") as File | null;

		if (!file) {
			return Response.json(
				{ success: false, error: "Ingen fil lastet opp." },
				{ status: 400 },
			);
		}

		const mediaType = file.type as SupportedMediaType;
		if (!SUPPORTED_MEDIA_TYPES.includes(mediaType)) {
			return Response.json(
				{ success: false, error: "Ustøttet filformat." },
				{ status: 400 },
			);
		}

		if (file.size > MAX_FILE_SIZE) {
			return Response.json(
				{
					success: false,
					error: "Filen er for stor. Maksimal filstørrelse er 16 MB.",
				},
				{ status: 413 },
			);
		}

		const householdId = await getHouseholdId(user.id as string);

		const userAccounts = householdId
			? await db
					.select({ id: accounts.id, accountNumber: accounts.accountNumber })
					.from(accounts)
					.where(
						and(
							eq(accounts.householdId, householdId),
							isNull(accounts.deletedAt),
						),
					)
			: [];

		const buffer = await file.arrayBuffer();
		const base64 = Buffer.from(buffer).toString("base64");

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

		if (!householdId) {
			const raw = await extractTransactions(base64, mediaType);
			if (!raw.success) return Response.json(raw);
			const result: EnrichedExtractionResult = {
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
			return Response.json(result);
		}

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
		if (!raw.success) return Response.json(raw);

		const enriched: EnrichedTransaction[] = raw.transactions.map((tx) => {
			const txAccountNumber = tx.accountNumber ?? null;
			const txAccountId = matchAccountId(txAccountNumber);

			const historyMatch = findBestHistoryCategory(tx.description, history);
			if (historyMatch) {
				return {
					date: tx.date,
					amountOere: tx.amountOere,
					description: tx.description,
					categoryId: historyMatch,
					categorySource: "history" as const,
					suggestedNewCategory: null,
					aiConfidence: tx.confidence,
					accountNumber: txAccountNumber,
					accountId: txAccountId,
				};
			}

			const aiMatch = findCategoryInDb(tx.suggestedCategory, dbCategories);
			if (aiMatch) {
				return {
					date: tx.date,
					amountOere: tx.amountOere,
					description: tx.description,
					categoryId: aiMatch,
					categorySource: "ai" as const,
					suggestedNewCategory: null,
					aiConfidence: tx.confidence,
					accountNumber: txAccountNumber,
					accountId: txAccountId,
				};
			}

			const suggestedNew =
				tx.suggestedCategory && tx.suggestedCategory !== "Annet"
					? tx.suggestedCategory
					: null;
			return {
				date: tx.date,
				amountOere: tx.amountOere,
				description: tx.description,
				categoryId: null,
				categorySource: "none" as const,
				suggestedNewCategory: suggestedNew,
				aiConfidence: tx.confidence,
				accountNumber: txAccountNumber,
				accountId: txAccountId,
			};
		});

		return Response.json({
			success: true,
			transactions: enriched,
		} satisfies EnrichedExtractionResult);
	} catch (error) {
		if (error instanceof Error) {
			if (error.message === "Unauthorized") {
				return Response.json(
					{ success: false, error: "Ikke autorisert." },
					{ status: 401 },
				);
			}
			if (error.message.startsWith("CSRF protection")) {
				return Response.json(
					{ success: false, error: "Ugyldig forespørsel." },
					{ status: 403 },
				);
			}
			if (error.message.startsWith("Rate limit")) {
				return Response.json(
					{
						success: false,
						error: "For mange forespørsler. Prøv igjen senere.",
					},
					{ status: 429 },
				);
			}
			if (error.message.includes("Service temporarily unavailable")) {
				return Response.json(
					{
						success: false,
						error: "Tjenesten er midlertidig utilgjengelig. Prøv igjen senere.",
					},
					{ status: 503 },
				);
			}
		}
		const errorId = crypto.randomUUID().slice(0, 8);
		console.error(
			`[AI Extract ${errorId}]`,
			error instanceof Error ? error.message : String(error),
		);
		return Response.json(
			{ success: false, error: "Kunne ikke behandle dokumentet. Prøv igjen." },
			{ status: 500 },
		);
	}
}
