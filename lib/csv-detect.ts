/**
 * CSV format detection for Norwegian bank exports.
 *
 * Supports DNB, Nordea, and Sparebank 1 CSV export formats.
 */

export type Delimiter = "," | ";" | "\t";
export type DecimalSeparator = "." | ",";
export type DateFormat = "dd.mm.yyyy" | "yyyy-mm-dd" | "unknown";
export type EncodingHint = "UTF-8" | "ISO-8859-1";

export interface CsvDetectionResult {
	delimiter: Delimiter;
	decimalSeparator: DecimalSeparator;
	dateFormat: DateFormat;
	encodingHint: EncodingHint;
	/** true when all detections fired with high certainty */
	confident: boolean;
	/** optional detected bank brand */
	bankHint?: "dnb" | "nordea" | "sparebank1" | "unknown";
}

// ---------------------------------------------------------------------------
// Sample bank CSV signatures used for format reference / unit-testing
// ---------------------------------------------------------------------------

/**
 * Representative CSV rows from common Norwegian banks.
 * These are used internally to verify the detector and can be imported
 * in tests.
 */
export const BANK_SAMPLES: Record<string, string> = {
	dnb: [
		'"Dato";"Forklaringstekst";"Rentedato";"Beløp";"Saldo"',
		'"01.01.2024";"Netthandel NETFLIX";"03.01.2024";"-179,00";"24821,00"',
		'"15.01.2024";"Lønn ARBEIDSGIVER AS";"17.01.2024";"45000,00";"69821,00"',
	].join("\n"),

	nordea: [
		"Bokføringsdato;Beløp;Avsender;Mottaker;Navn;Tittel;Valuta;Betalt beløp",
		"01.01.2024;-350,00;12345678901;98765432101;REMA 1000;Dagligvarer;NOK;350,00",
		"15.01.2024;45000,00;34567890123;12345678901;ARBEIDSGIVER AS;Lønnsutbetaling;NOK;45000,00",
	].join("\n"),

	sparebank1: [
		'"Dato";"Beskrivelse";"Beløp";"Ut fra konto";"Inn på konto"',
		'"01.01.2024";"REMA 1000 OSLO";"-350,00";"350,00";""',
		'"15.01.2024";"Lønnsutbetaling";"45000,00";"";""45000,00"',
	].join("\n"),
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function countChar(str: string, char: string): number {
	let n = 0;
	for (let i = 0; i < str.length; i++) {
		if (str[i] === char) n++;
	}
	return n;
}

/**
 * Detect the most likely field delimiter by comparing occurrence counts
 * across the first N non-empty lines. The candidate with the highest and
 * most consistent count wins.
 */
function detectDelimiter(lines: string[]): {
	delimiter: Delimiter;
	confident: boolean;
} {
	const candidates: Delimiter[] = [";", ",", "\t"];
	const scores: Record<string, number[]> = { ";": [], ",": [], "\t": [] };

	for (const line of lines) {
		for (const c of candidates) {
			scores[c].push(countChar(line, c));
		}
	}

	// Choose the candidate with highest mean count
	let best: Delimiter = ";";
	let bestMean = -1;
	for (const c of candidates) {
		const counts = scores[c];
		const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
		if (mean > bestMean) {
			bestMean = mean;
			best = c as Delimiter;
		}
	}

	// Confident if the winning delimiter appears at least once per line on average
	const confident = bestMean >= 1;
	return { delimiter: best, confident };
}

/**
 * Detect the decimal separator used in numeric fields.
 * Strategy: split lines by the detected delimiter, then for each cell
 * check whether it looks like a number with `.` or `,` as decimal marker.
 */
function detectDecimalSeparator(
	lines: string[],
	delimiter: Delimiter,
): { decimalSeparator: DecimalSeparator; confident: boolean } {
	// Regex: optional minus, digits, separator, exactly 2 digits at end
	const dotPattern = /^-?\d{1,3}(?:\.\d{3})*(?:\.\d{1,2})?$|^-?\d+\.\d{1,2}$/;
	const commaPattern = /^-?\d{1,3}(?:,\d{3})*(?:,\d{1,2})?$|^-?\d+,\d{1,2}$/;

	let dotScore = 0;
	let commaScore = 0;

	for (const line of lines) {
		const cells = line
			.split(delimiter)
			.map((c) => c.replace(/^"|"$/g, "").trim());
		for (const cell of cells) {
			if (cell === "" || cell === "-") continue;
			if (commaPattern.test(cell)) commaScore++;
			else if (dotPattern.test(cell)) dotScore++;
		}
	}

	if (commaScore === 0 && dotScore === 0) {
		return { decimalSeparator: ",", confident: false };
	}

	const decimalSeparator: DecimalSeparator = commaScore >= dotScore ? "," : ".";
	const confident = Math.abs(commaScore - dotScore) > 0;
	return { decimalSeparator, confident };
}

/**
 * Detect date format by scanning cells for date-like patterns.
 */
function detectDateFormat(
	lines: string[],
	delimiter: Delimiter,
): { dateFormat: DateFormat; confident: boolean } {
	const ddmmyyyy = /^\d{2}\.\d{2}\.\d{4}$/;
	const yyyymmdd = /^\d{4}-\d{2}-\d{2}$/;

	let ddScore = 0;
	let isoScore = 0;

	for (const line of lines) {
		const cells = line
			.split(delimiter)
			.map((c) => c.replace(/^"|"$/g, "").trim());
		for (const cell of cells) {
			if (ddmmyyyy.test(cell)) ddScore++;
			else if (yyyymmdd.test(cell)) isoScore++;
		}
	}

	if (ddScore === 0 && isoScore === 0) {
		return { dateFormat: "unknown", confident: false };
	}

	if (ddScore >= isoScore) {
		return { dateFormat: "dd.mm.yyyy", confident: ddScore > 0 };
	}
	return { dateFormat: "yyyy-mm-dd", confident: isoScore > 0 };
}

/**
 * Heuristic encoding hint.  JavaScript strings are always Unicode once parsed,
 * but if the raw bytes contain common ISO-8859-1 patterns (e.g. the replacement
 * character U+FFFD) we surface that so callers can re-read with the right
 * encoding.  When working purely with a JS string we look for the tell-tale
 * replacement character that browsers insert when decoding ISO-8859-1 as UTF-8.
 */
function detectEncoding(raw: string): EncodingHint {
	// U+FFFD replacement character = sign of mis-decoded latin-1
	if (raw.includes("\uFFFD")) return "ISO-8859-1";
	// Norwegian characters encoded as latin-1 commonly appear as Ã¦, Ã¸, Ã…
	if (/Ã[¦¸…]/.test(raw)) return "ISO-8859-1";
	return "UTF-8";
}

/**
 * Attempt to identify the bank from header column names.
 */
function detectBank(
	headerLine: string,
	delimiter: Delimiter,
): CsvDetectionResult["bankHint"] {
	const cols = headerLine
		.split(delimiter)
		.map((c) => c.replace(/^"|"$/g, "").toLowerCase().trim());
	const joined = cols.join("|");

	if (joined.includes("forklaringstekst") && joined.includes("rentedato")) {
		return "dnb";
	}
	if (joined.includes("bokf\u00f8ringsdato") || joined.includes("avsender")) {
		return "nordea";
	}
	if (joined.includes("ut fra konto") || joined.includes("inn p\u00e5 konto")) {
		return "sparebank1";
	}
	return "unknown";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect the format of a raw CSV string.
 *
 * @param raw  The full (or partial) CSV content as a string.
 * @param sampleLines  Number of lines to inspect (default 20).
 */
export function detectCsvFormat(
	raw: string,
	sampleLines = 20,
): CsvDetectionResult {
	const allLines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
	const lines = allLines.slice(0, sampleLines);

	const { delimiter, confident: delimConf } = detectDelimiter(lines);

	// Skip header line for value-based detection
	const dataLines = lines.length > 1 ? lines.slice(1) : lines;

	const { decimalSeparator, confident: decConf } = detectDecimalSeparator(
		dataLines,
		delimiter,
	);
	const { dateFormat, confident: dateConf } = detectDateFormat(
		dataLines,
		delimiter,
	);
	const encodingHint = detectEncoding(raw);
	const bankHint =
		lines.length > 0 ? detectBank(lines[0], delimiter) : "unknown";

	const confident = delimConf && decConf && dateConf;

	return {
		delimiter,
		decimalSeparator,
		dateFormat,
		encodingHint,
		confident,
		bankHint,
	};
}
