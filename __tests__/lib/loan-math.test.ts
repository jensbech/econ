import { describe, expect, it } from "vitest";
import { computeLoanBalance, computeMonthlyPayment } from "@/lib/loan-math";

// ---------------------------------------------------------------------------
// computeMonthlyPayment
// ---------------------------------------------------------------------------

describe("computeMonthlyPayment", () => {
	it("computes zero-interest loan as ceiling of principal / term", () => {
		// 100 000 øre over 10 months = 10 000 øre/month
		expect(computeMonthlyPayment(100_000, 0, 10)).toBe(10_000);
	});

	it("rounds up for zero-interest when not evenly divisible", () => {
		// 10 001 øre / 10 months → ceil(1000.1) = 1001
		expect(computeMonthlyPayment(10_001, 0, 10)).toBe(1_001);
	});

	it("computes standard mortgage payment (5% annual, 300 months)", () => {
		// 3 000 000 NOK = 300 000 000 øre, 5% annual, 25 years
		const payment = computeMonthlyPayment(300_000_000, 5, 300);
		// Standard amortization: ~1 754 000 øre ≈ 17 540 NOK/month
		expect(payment).toBeGreaterThan(1_700_000);
		expect(payment).toBeLessThan(1_800_000);
	});

	it("computes a simple 2% annual, 12-month loan", () => {
		// 120 000 øre (1 200 NOK) at 2% annual over 12 months
		const payment = computeMonthlyPayment(120_000, 2, 12);
		// ~10 100 øre/month
		expect(payment).toBeGreaterThan(10_000);
		expect(payment).toBeLessThan(11_000);
	});

	it("returns a positive integer", () => {
		const payment = computeMonthlyPayment(500_000, 3.5, 60);
		expect(Number.isInteger(payment)).toBe(true);
		expect(payment).toBeGreaterThan(0);
	});

	it("handles high interest rate", () => {
		// 20% annual rate
		const payment = computeMonthlyPayment(100_000, 20, 12);
		expect(payment).toBeGreaterThan(100_000 / 12);
	});

	it("handles single-month term", () => {
		const payment = computeMonthlyPayment(50_000, 5, 1);
		// Should be approximately principal + one month's interest
		expect(payment).toBeGreaterThan(50_000);
		expect(payment).toBeLessThan(51_000);
	});
});

// ---------------------------------------------------------------------------
// computeLoanBalance — helpers
// ---------------------------------------------------------------------------

/**
 * Returns a start date that is exactly `monthsAgo` months before today.
 */
function monthsAgo(n: number): string {
	const d = new Date();
	d.setMonth(d.getMonth() - n);
	return d.toISOString().slice(0, 10);
}

/**
 * Returns today's date as yyyy-MM-dd.
 */
function today(): string {
	return new Date().toISOString().slice(0, 10);
}

/**
 * Returns a date in the future (months from now).
 */
function monthsFromNow(n: number): string {
	const d = new Date();
	d.setMonth(d.getMonth() + n);
	return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// computeLoanBalance
// ---------------------------------------------------------------------------

describe("computeLoanBalance", () => {
	it("returns full principal when loan just started (0 months elapsed)", () => {
		const result = computeLoanBalance(1_000_000, 5, 120, today(), []);
		// No payments made yet — balance should be close to principal
		expect(result.currentBalanceOere).toBeGreaterThan(0);
		expect(result.currentBalanceOere).toBeLessThanOrEqual(1_000_000);
	});

	it("balance decreases over time", () => {
		const principal = 2_000_000; // 20 000 NOK
		const rate = 5;
		const term = 120;

		const earlyResult = computeLoanBalance(
			principal,
			rate,
			term,
			monthsAgo(6),
			[],
		);
		const laterResult = computeLoanBalance(
			principal,
			rate,
			term,
			monthsAgo(12),
			[],
		);

		expect(laterResult.currentBalanceOere).toBeLessThan(
			earlyResult.currentBalanceOere,
		);
	});

	it("returns zero balance when loan is fully amortized", () => {
		// Start the loan far enough in the past that it should be paid off
		const result = computeLoanBalance(100_000, 0, 5, monthsAgo(10), []);
		expect(result.currentBalanceOere).toBe(0);
	});

	it("returns correct monthly payment", () => {
		const principal = 1_000_000;
		const rate = 4;
		const term = 60;
		const result = computeLoanBalance(principal, rate, term, today(), []);
		const expectedPayment = computeMonthlyPayment(principal, rate, term);
		expect(result.monthlyPaymentOere).toBe(expectedPayment);
	});

	it("principalPaidPct is 0 when loan just started", () => {
		const result = computeLoanBalance(1_000_000, 5, 120, today(), []);
		expect(result.principalPaidPct).toBe(0);
	});

	it("principalPaidPct is 100 when loan is fully paid", () => {
		const result = computeLoanBalance(100_000, 0, 3, monthsAgo(10), []);
		expect(result.principalPaidPct).toBe(100);
	});

	it("principalPaidPct is between 0 and 100", () => {
		const result = computeLoanBalance(1_000_000, 5, 120, monthsAgo(30), []);
		expect(result.principalPaidPct).toBeGreaterThanOrEqual(0);
		expect(result.principalPaidPct).toBeLessThanOrEqual(100);
	});

	it("extra payments reduce the balance", () => {
		const principal = 1_000_000;
		const startDate = monthsAgo(6);

		const withoutExtra = computeLoanBalance(principal, 5, 120, startDate, []);
		const withExtra = computeLoanBalance(principal, 5, 120, startDate, [
			{ date: monthsAgo(3), amountOere: 50_000 },
		]);

		expect(withExtra.currentBalanceOere).toBeLessThan(
			withoutExtra.currentBalanceOere,
		);
	});

	it("multiple extra payments stack", () => {
		const principal = 500_000;
		const startDate = monthsAgo(6);

		const withOneExtra = computeLoanBalance(principal, 5, 60, startDate, [
			{ date: monthsAgo(4), amountOere: 10_000 },
		]);
		const withTwoExtra = computeLoanBalance(principal, 5, 60, startDate, [
			{ date: monthsAgo(4), amountOere: 10_000 },
			{ date: monthsAgo(2), amountOere: 10_000 },
		]);

		expect(withTwoExtra.currentBalanceOere).toBeLessThan(
			withOneExtra.currentBalanceOere,
		);
	});

	it("future start date results in zero elapsed months (no payments yet)", () => {
		const result = computeLoanBalance(500_000, 3, 60, monthsFromNow(2), []);
		// No months elapsed, balance = principal
		expect(result.currentBalanceOere).toBe(500_000);
	});

	it("handles zero interest rate with extra payments", () => {
		const principal = 120_000;
		const startDate = monthsAgo(3);

		const result = computeLoanBalance(principal, 0, 12, startDate, [
			{ date: monthsAgo(1), amountOere: 20_000 },
		]);
		// Balance should be reduced by extra payment
		expect(result.currentBalanceOere).toBeLessThan(principal);
	});

	it("remainingMonths is 0 when balance is 0", () => {
		const result = computeLoanBalance(100_000, 0, 5, monthsAgo(10), []);
		expect(result.remainingMonths).toBe(0);
	});

	it("remainingMonths decreases as loan ages", () => {
		const principal = 1_000_000;
		const rate = 5;
		const term = 120;

		const early = computeLoanBalance(principal, rate, term, monthsAgo(12), []);
		const later = computeLoanBalance(principal, rate, term, monthsAgo(24), []);

		expect(later.remainingMonths).toBeLessThan(early.remainingMonths);
	});

	it("result object has all expected properties", () => {
		const result = computeLoanBalance(1_000_000, 5, 120, monthsAgo(6), []);
		expect(result).toHaveProperty("currentBalanceOere");
		expect(result).toHaveProperty("monthlyPaymentOere");
		expect(result).toHaveProperty("remainingMonths");
		expect(result).toHaveProperty("principalPaidPct");
	});

	it("same-month extra payments are aggregated", () => {
		const principal = 500_000;
		const startDate = monthsAgo(6);
		const paymentMonth = monthsAgo(3);

		const withCombined = computeLoanBalance(principal, 5, 60, startDate, [
			{ date: paymentMonth, amountOere: 30_000 },
		]);
		// Split into two payments in same month
		const withSplit = computeLoanBalance(principal, 5, 60, startDate, [
			{ date: paymentMonth, amountOere: 15_000 },
			{ date: paymentMonth, amountOere: 15_000 },
		]);

		expect(withSplit.currentBalanceOere).toBe(withCombined.currentBalanceOere);
	});
});
