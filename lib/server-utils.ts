import type { z } from "zod";

/**
 * Convert a NOK string (e.g. "12.50" or "12,50") to øre (integer).
 * Throws if the value is not a valid non-negative number.
 */
const MAX_OERE = 2_000_000_000;

export function nokToOere(nokStr: string): number {
	const normalized = nokStr.replace(",", ".");
	const value = Number.parseFloat(normalized);
	if (Number.isNaN(value) || value < 0) throw new Error("Ugyldig beløp");
	const oere = Math.round(value * 100);
	if (oere > MAX_OERE) throw new Error("Beløp er for stort");
	return oere;
}

/**
 * Map a ZodError's issues to a per-field error record.
 */
export function extractFieldErrors(
	error: z.ZodError,
): Record<string, string[]> {
	const fieldErrors: Record<string, string[]> = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? "");
		if (key) {
			fieldErrors[key] = fieldErrors[key] ?? [];
			fieldErrors[key].push(issue.message);
		}
	}
	return fieldErrors;
}

/**
 * Parse dd.mm.yyyy or yyyy-mm-dd to ISO yyyy-mm-dd.
 * Returns null if the string cannot be parsed or represents an invalid date.
 */
export function parseDateToIso(dateStr: string): string | null {
	const s = dateStr.trim();
	// dd.mm.yyyy → yyyy-mm-dd
	const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
	if (m) {
		const day = parseInt(m[1], 10);
		const month = parseInt(m[2], 10);
		const year = parseInt(m[3], 10);

		// Validate that the date is actually valid (rejects 31.02.2024, etc.)
		const date = new Date(year, month - 1, day);
		if (date.getDate() !== day || date.getMonth() !== month - 1) {
			return null; // Invalid date
		}

		return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	}

	// Already ISO format
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
		const date = new Date(s + "T00:00:00Z");
		if (Number.isNaN(date.getTime())) return null; // Invalid ISO date
		return s;
	}

	return null;
}
