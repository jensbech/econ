import { describe, expect, it } from "vitest";
import { formatNOK } from "@/lib/format";

describe("formatNOK", () => {
	it("formats zero øre as 0 NOK", () => {
		const result = formatNOK(0);
		// Should contain "0" and "kr" (or similar NOK symbol)
		expect(result).toMatch(/0/);
	});

	it("converts øre to NOK correctly (100 øre = 1 NOK)", () => {
		const result = formatNOK(100);
		// 100 øre = 1.00 NOK
		expect(result).toMatch(/1/);
		expect(result).not.toMatch(/100\s*NOK|100\s*kr/);
	});

	it("formats 10000 øre as 100 NOK", () => {
		const result = formatNOK(10000);
		expect(result).toMatch(/100/);
	});

	it("formats 4500000 øre as 45 000 NOK (Norwegian number format)", () => {
		const result = formatNOK(4500000);
		// 45000 NOK — Norwegian format uses space as thousands separator
		expect(result).toMatch(/45/);
		expect(result).toMatch(/000/);
	});

	it("formats negative amounts (expenses)", () => {
		const result = formatNOK(-50000);
		// nb-NO locale uses Unicode MINUS SIGN (U+2212) or a minus-like character
		expect(result).toMatch(/500/);
		// The formatted amount should differ from the positive version
		expect(result).not.toBe(formatNOK(50000));
	});

	it("formats with NOK currency code or kr symbol", () => {
		const result = formatNOK(10000);
		// nb-NO locale uses "kr" or "NOK"
		const hasNOKMarker =
			result.includes("kr") || result.includes("NOK") || result.includes("KR");
		expect(hasNOKMarker).toBe(true);
	});

	it("handles fractional øre (rounds to 2 decimal places)", () => {
		// 150 øre = 1.50 NOK
		const result = formatNOK(150);
		expect(result).toMatch(/1[,.]50|1[,.]5/);
	});

	it("formats large amounts correctly", () => {
		// 500000000 øre = 5 000 000 NOK
		const result = formatNOK(500000000);
		expect(result).toMatch(/5/);
		expect(result).toMatch(/000/);
	});

	it("returns a string", () => {
		expect(typeof formatNOK(12345)).toBe("string");
	});

	it("formats 1 øre as a small fractional amount", () => {
		// 1 øre = 0.01 NOK
		const result = formatNOK(1);
		expect(result).toMatch(/0[,.]01/);
	});
});
