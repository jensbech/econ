import { describe, expect, it } from "vitest";
import { BANK_SAMPLES, detectCsvFormat } from "@/lib/csv-detect";

// ---------------------------------------------------------------------------
// BANK_SAMPLES existence
// ---------------------------------------------------------------------------

describe("BANK_SAMPLES", () => {
	it("contains dnb sample", () => {
		expect(BANK_SAMPLES.dnb).toBeTruthy();
		expect(typeof BANK_SAMPLES.dnb).toBe("string");
	});

	it("contains nordea sample", () => {
		expect(BANK_SAMPLES.nordea).toBeTruthy();
	});

	it("contains sparebank1 sample", () => {
		expect(BANK_SAMPLES.sparebank1).toBeTruthy();
	});

	it("dnb sample has semicolon delimiter", () => {
		expect(BANK_SAMPLES.dnb).toContain(";");
	});

	it("dnb sample has Norwegian date format", () => {
		expect(BANK_SAMPLES.dnb).toMatch(/\d{2}\.\d{2}\.\d{4}/);
	});
});

// ---------------------------------------------------------------------------
// DNB format detection
// ---------------------------------------------------------------------------

describe("detectCsvFormat — DNB", () => {
	it("detects semicolon delimiter", () => {
		const result = detectCsvFormat(BANK_SAMPLES.dnb);
		expect(result.delimiter).toBe(";");
	});

	it("detects dd.mm.yyyy date format", () => {
		const result = detectCsvFormat(BANK_SAMPLES.dnb);
		expect(result.dateFormat).toBe("dd.mm.yyyy");
	});

	it("detects comma decimal separator", () => {
		const result = detectCsvFormat(BANK_SAMPLES.dnb);
		expect(result.decimalSeparator).toBe(",");
	});

	it("detects dnb bank hint", () => {
		const result = detectCsvFormat(BANK_SAMPLES.dnb);
		expect(result.bankHint).toBe("dnb");
	});

	it("is confident about the detection", () => {
		const result = detectCsvFormat(BANK_SAMPLES.dnb);
		expect(result.confident).toBe(true);
	});

	it("returns UTF-8 encoding for clean ASCII/Unicode", () => {
		const result = detectCsvFormat(BANK_SAMPLES.dnb);
		expect(result.encodingHint).toBe("UTF-8");
	});
});

// ---------------------------------------------------------------------------
// Nordea format detection
// ---------------------------------------------------------------------------

describe("detectCsvFormat — Nordea", () => {
	it("detects semicolon delimiter", () => {
		const result = detectCsvFormat(BANK_SAMPLES.nordea);
		expect(result.delimiter).toBe(";");
	});

	it("detects dd.mm.yyyy date format", () => {
		const result = detectCsvFormat(BANK_SAMPLES.nordea);
		expect(result.dateFormat).toBe("dd.mm.yyyy");
	});

	it("detects comma decimal separator", () => {
		const result = detectCsvFormat(BANK_SAMPLES.nordea);
		expect(result.decimalSeparator).toBe(",");
	});

	it("detects nordea bank hint", () => {
		const result = detectCsvFormat(BANK_SAMPLES.nordea);
		expect(result.bankHint).toBe("nordea");
	});
});

// ---------------------------------------------------------------------------
// Sparebank 1 format detection
// ---------------------------------------------------------------------------

describe("detectCsvFormat — Sparebank 1", () => {
	it("detects semicolon delimiter", () => {
		const result = detectCsvFormat(BANK_SAMPLES.sparebank1);
		expect(result.delimiter).toBe(";");
	});

	it("detects dd.mm.yyyy date format", () => {
		const result = detectCsvFormat(BANK_SAMPLES.sparebank1);
		expect(result.dateFormat).toBe("dd.mm.yyyy");
	});

	it("detects sparebank1 bank hint", () => {
		const result = detectCsvFormat(BANK_SAMPLES.sparebank1);
		expect(result.bankHint).toBe("sparebank1");
	});
});

// ---------------------------------------------------------------------------
// ISO date format (yyyy-mm-dd)
// ---------------------------------------------------------------------------

describe("detectCsvFormat — ISO date format", () => {
	it("detects yyyy-mm-dd date format", () => {
		const csv = [
			"date,amount,description",
			"2024-01-15,1500.00,Salary",
			"2024-01-20,-350.00,Groceries",
			"2024-02-01,-200.50,Rent",
		].join("\n");
		const result = detectCsvFormat(csv);
		expect(result.dateFormat).toBe("yyyy-mm-dd");
	});

	it("detects comma delimiter", () => {
		const csv = [
			"date,amount,description",
			"2024-01-15,1500.00,Salary",
			"2024-01-20,-350.00,Groceries",
		].join("\n");
		const result = detectCsvFormat(csv);
		expect(result.delimiter).toBe(",");
	});

	it("detects dot decimal separator for international format", () => {
		const csv = [
			"date,amount,description",
			"2024-01-15,1500.00,Salary",
			"2024-01-20,-350.00,Groceries",
			"2024-02-01,-200.50,Rent",
		].join("\n");
		const result = detectCsvFormat(csv);
		expect(result.decimalSeparator).toBe(".");
	});
});

// ---------------------------------------------------------------------------
// Tab-delimited format
// ---------------------------------------------------------------------------

describe("detectCsvFormat — tab delimiter", () => {
	it("detects tab delimiter", () => {
		const csv = [
			"date\tamount\tdescription",
			"01.01.2024\t-179,00\tNetflix",
			"15.01.2024\t45000,00\tLønn",
		].join("\n");
		const result = detectCsvFormat(csv);
		expect(result.delimiter).toBe("\t");
	});
});

// ---------------------------------------------------------------------------
// Encoding detection
// ---------------------------------------------------------------------------

describe("detectCsvFormat — encoding detection", () => {
	it("detects ISO-8859-1 from replacement character", () => {
		const csv = "date;amount;description\n01.01.2024;-179,00;Caf\uFFFD";
		const result = detectCsvFormat(csv);
		expect(result.encodingHint).toBe("ISO-8859-1");
	});

	it("detects ISO-8859-1 from latin-1 garbled Norwegian chars (ø → Ã¸)", () => {
		// ø (U+00F8) encoded as latin-1 read as UTF-8 becomes Ã (U+00C3) + ¸ (U+00B8)
		const csv =
			"date;amount;description\n01.01.2024;-179,00;Gr\u00C3\u00B8nnsaker";
		const result = detectCsvFormat(csv);
		expect(result.encodingHint).toBe("ISO-8859-1");
	});

	it("detects UTF-8 for clean text", () => {
		const result = detectCsvFormat(BANK_SAMPLES.dnb);
		expect(result.encodingHint).toBe("UTF-8");
	});
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("detectCsvFormat — edge cases", () => {
	it("handles empty string gracefully", () => {
		const result = detectCsvFormat("");
		// Should return some defaults without throwing
		expect(result).toHaveProperty("delimiter");
		expect(result).toHaveProperty("dateFormat");
		expect(result).toHaveProperty("decimalSeparator");
	});

	it("handles single line CSV", () => {
		const result = detectCsvFormat('"Dato";"Beløp";"Tekst"');
		expect(result.delimiter).toBe(";");
	});

	it("respects sampleLines parameter", () => {
		// Build a long CSV with consistent format
		const lines = ["date;amount;desc"];
		for (let i = 0; i < 50; i++) {
			lines.push(`01.01.2024;-${i * 100},00;Desc ${i}`);
		}
		const csv = lines.join("\n");
		// Should work with limited sample lines
		const result = detectCsvFormat(csv, 5);
		expect(result.delimiter).toBe(";");
	});

	it("handles CRLF line endings", () => {
		const csv =
			'"Dato";"Beløp"\r\n"01.01.2024";"-179,00"\r\n"15.01.2024";"45000,00"';
		const result = detectCsvFormat(csv);
		expect(result.delimiter).toBe(";");
		expect(result.dateFormat).toBe("dd.mm.yyyy");
	});

	it("detects unknown bank for non-standard headers", () => {
		const csv = ["col1;col2;col3", "01.01.2024;-100,00;Something"].join("\n");
		const result = detectCsvFormat(csv);
		expect(result.bankHint).toBe("unknown");
	});

	it("returns unknown dateFormat when no dates are found", () => {
		const csv = ["description;amount", "Netflix;-179", "Salary;45000"].join(
			"\n",
		);
		const result = detectCsvFormat(csv);
		expect(result.dateFormat).toBe("unknown");
	});

	it("result object has all required fields", () => {
		const result = detectCsvFormat(BANK_SAMPLES.dnb);
		expect(result).toHaveProperty("delimiter");
		expect(result).toHaveProperty("decimalSeparator");
		expect(result).toHaveProperty("dateFormat");
		expect(result).toHaveProperty("encodingHint");
		expect(result).toHaveProperty("confident");
		expect(result).toHaveProperty("bankHint");
	});
});

// ---------------------------------------------------------------------------
// Helper function coverage: detectDelimiter edge cases
// ---------------------------------------------------------------------------

describe("detectCsvFormat — delimiter edge cases", () => {
	it("prefers semicolon over comma when both appear equally", () => {
		// Comma in amounts, semicolon as delimiter
		const csv = [
			"dato;beloep;tekst",
			"01.01.2024;-179,00;test",
			"15.01.2024;45000,00;test2",
		].join("\n");
		const result = detectCsvFormat(csv);
		// Semicolons should win
		expect(result.delimiter).toBe(";");
	});

	it("picks comma delimiter when commas dominate", () => {
		const csv = [
			"date,amount,description,extra",
			"2024-01-15,1500.00,Salary,work",
			"2024-01-20,-350.00,Groceries,food",
		].join("\n");
		const result = detectCsvFormat(csv);
		expect(result.delimiter).toBe(",");
	});
});
