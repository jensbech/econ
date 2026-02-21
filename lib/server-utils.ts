import type { z } from "zod";

/**
 * Convert a NOK string (e.g. "12.50" or "12,50") to øre (integer).
 * Throws if the value is not a valid non-negative number.
 */
export function nokToOere(nokStr: string): number {
	const normalized = nokStr.replace(",", ".");
	const value = Number.parseFloat(normalized);
	if (Number.isNaN(value) || value < 0) throw new Error("Ugyldig beløp");
	return Math.round(value * 100);
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
 * Returns null if the string cannot be parsed.
 */
export function parseDateToIso(dateStr: string): string | null {
	const s = dateStr.trim();
	// dd.mm.yyyy → yyyy-mm-dd
	const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
	if (m) return `${m[3]}-${m[2]}-${m[1]}`;
	// Already ISO
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
	return null;
}
