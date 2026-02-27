import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, jsonSchema } from "ai";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedTransaction {
	date: string; // dd.mm.yyyy
	amountOere: number; // positive = expense, negative = income/refund
	description: string;
	suggestedCategory: string;
	confidence: "high" | "medium" | "low";
	accountNumber: string | null; // extracted from statement header/context
}

export type AiExtractionResult =
	| { success: true; transactions: ExtractedTransaction[] }
	| { success: false; error: string };

export type SupportedMediaType =
	| "application/pdf"
	| "image/jpeg"
	| "image/png"
	| "image/webp";

// ─── Schema (JSON Schema to avoid Zod version conflicts) ─────────────────────

const extractionJsonSchema = jsonSchema<{
	transactions: ExtractedTransaction[];
}>({
	type: "object",
	additionalProperties: false,
	properties: {
		transactions: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					date: {
						type: "string",
						description: "Transaksjonsdato i formatet dd.mm.yyyy",
					},
					amountOere: {
						type: "number",
						description:
							"Beløp i øre (1 NOK = 100 øre). Utgifter er positive heltall, inntekter/refusjoner er negative heltall.",
					},
					description: {
						type: "string",
						description: "Kort transaksjonsbeskrivelse eller butikknavn",
					},
					suggestedCategory: {
						type: "string",
						description: "Foreslått norsk utgiftskategori",
					},
					confidence: {
						type: "string",
						enum: ["high", "medium", "low"],
						description:
							"Konfidensgrad: high = tydelig, medium = noe usikkert, low = utydelig",
					},
					accountNumber: {
						type: ["string", "null"],
						description:
							"Kontonummer fra dokumentet (f.eks. fra kontoutskrift-header). Null hvis ikke funnet.",
					},
				},
				required: [
					"date",
					"amountOere",
					"description",
					"suggestedCategory",
					"confidence",
					"accountNumber",
				],
			},
		},
	},
	required: ["transactions"],
});

// ─── Category list for prompting ─────────────────────────────────────────────

const FALLBACK_CATEGORIES = [
	"Mat & dagligvarer",
	"Transport",
	"Bolig",
	"Helse & apotek",
	"Klær & sko",
	"Underholdning",
	"Restaurant & kafé",
	"Abonnementer",
	"Reise",
	"Barn",
	"Sparing",
	"Lønn",
	"Variabel inntekt",
	"Annet",
];

function buildSystemPrompt(categoryNames?: string[]): string {
	const categories = categoryNames ?? FALLBACK_CATEGORIES;
	return `Du er en norsk regnskapsassistent. Trekk ut alle transaksjoner fra dokumentet.

Regler:
- Datoer: konverter til dd.mm.yyyy format
- Beløp: konverter til øre (1 NOK = 100 øre), heltall. Utgifter er positive tall. Inntekter og refusjoner er negative tall.
- Beskrivelse: kort og norsk, gjerne butikknavn eller transaksjonskategori
- suggestedCategory: velg én fra listen nedenfor (bruk eksakt stavemåte)
- confidence: "high" hvis dato og beløp er klart leselig, "medium" hvis noe er usikkert, "low" hvis mye er utydelig
- accountNumber: Hvis dokumentet er en kontoutskrift, trekk ut kontonummeret fra headeren/overskriften. Formater som ren tekst (f.eks. "1234.56.78901"). Sett null hvis ikke funnet eller ved kvittering.

Gyldige kategorier (bruk eksakt stavemåte):
${JSON.stringify(categories)}

Returner et JSON-objekt med en "transactions"-liste. Hvis ingen transaksjoner finnes, returner { "transactions": [] }.`;
}

// ─── Main extraction function ─────────────────────────────────────────────────

export async function extractTransactions(
	base64: string,
	mediaType: SupportedMediaType,
	categoryNames?: string[],
): Promise<AiExtractionResult> {
	try {
		const mediaPart =
			mediaType === "application/pdf"
				? {
						type: "file" as const,
						data: base64,
						mediaType: "application/pdf" as const,
					}
				: {
						type: "image" as const,
						image: base64,
						mediaType: mediaType,
					};

		const { object } = await generateObject({
			model: anthropic("claude-sonnet-4-6"),
			schema: extractionJsonSchema,
			messages: [
				{
					role: "user",
					content: [
						mediaPart,
						{
							type: "text",
							text: buildSystemPrompt(categoryNames),
						},
					],
				},
			],
		});

		return { success: true, transactions: object.transactions };
	} catch (error) {
		// Log sanitized error server-side (do not log full error object or stack)
		const errorId = Math.random().toString(36).substring(7);
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`[AI Extraction Error ${errorId}] ${errorMessage}`);

		// Return generic message to client
		return {
			success: false,
			error: "Kunne ikke behandle dokumentet. Prøv igjen senere.",
		};
	}
}
