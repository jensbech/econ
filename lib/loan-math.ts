export interface LoanBalanceResult {
	currentBalanceOere: number;
	monthlyPaymentOere: number;
	remainingMonths: number;
	principalPaidPct: number; // 0–100
}

/** Compute the fixed monthly payment for a standard amortizing loan. */
export function computeMonthlyPayment(
	principalOere: number,
	annualRatePct: number,
	termMonths: number,
): number {
	if (annualRatePct === 0) {
		return Math.ceil(principalOere / termMonths);
	}
	const r = annualRatePct / 100 / 12;
	const n = termMonths;
	const factor = (1 + r) ** n;
	return Math.round((principalOere * r * factor) / (factor - 1));
}

/**
 * Simulate amortization from startDate to today, applying the scheduled
 * monthly payment each period and deducting any extra recorded payments.
 *
 * Recorded payments are treated as EXTRA payments on top of the scheduled
 * amortization payment (i.e., they speed up payoff, not replace it).
 *
 * If openingBalanceOere and openingBalanceDate are both provided, the
 * simulation starts from openingBalanceDate using openingBalanceOere as
 * the initial balance, and only extra payments on or after that date are
 * applied. principalOere is still used for principalPaidPct calculation.
 */
export function computeLoanBalance(
	principalOere: number,
	annualRatePct: number,
	termMonths: number,
	startDate: string, // "yyyy-MM-dd"
	extraPayments: Array<{ date: string; amountOere: number }>,
	openingBalanceOere?: number | null,
	openingBalanceDate?: string | null,
): LoanBalanceResult {
	const monthlyRate = annualRatePct / 100 / 12;
	const monthlyPaymentOere = computeMonthlyPayment(
		principalOere,
		annualRatePct,
		termMonths,
	);

	const simStart = openingBalanceOere != null && openingBalanceDate != null
		? openingBalanceDate
		: startDate;

	// Convert simStart to an absolute month index (year * 12 + month0)
	const sy = Number(simStart.substring(0, 4));
	const sm = Number(simStart.substring(5, 7)) - 1; // 0-indexed month
	const startMonthIdx = sy * 12 + sm;

	const now = new Date();
	const nowMonthIdx = now.getFullYear() * 12 + now.getMonth();
	const monthsElapsed = Math.max(0, nowMonthIdx - startMonthIdx);

	// Build extra-payments map: absolute-month-index → total øre
	// When using opening balance, only include payments on/after openingBalanceDate
	const filterDate = openingBalanceOere != null && openingBalanceDate != null
		? openingBalanceDate
		: null;
	const extraByMonth = new Map<number, number>();
	for (const p of extraPayments) {
		if (filterDate && p.date < filterDate) continue;
		const py = Number(p.date.substring(0, 4));
		const pm = Number(p.date.substring(5, 7)) - 1;
		const idx = py * 12 + pm;
		extraByMonth.set(idx, (extraByMonth.get(idx) ?? 0) + p.amountOere);
	}

	// Month-by-month amortization simulation
	let balance = openingBalanceOere != null && openingBalanceDate != null
		? openingBalanceOere
		: principalOere;
	const steps = Math.min(monthsElapsed, termMonths);

	for (let step = 0; step < steps && balance > 0; step++) {
		// Accrue one month of interest
		if (monthlyRate > 0) {
			balance = Math.round(balance + balance * monthlyRate);
		}
		// Apply scheduled payment
		balance = Math.max(0, balance - monthlyPaymentOere);
		// Apply any extra payments recorded in this period
		const extra = extraByMonth.get(startMonthIdx + step) ?? 0;
		if (extra > 0) {
			balance = Math.max(0, balance - extra);
		}
	}

	// Estimate remaining months at current payment rate
	let remainingMonths: number;
	if (balance <= 0) {
		remainingMonths = 0;
	} else if (monthlyPaymentOere <= 0) {
		remainingMonths = termMonths;
	} else if (monthlyRate === 0) {
		remainingMonths = Math.ceil(balance / monthlyPaymentOere);
	} else {
		const r = monthlyRate;
		const ratio = (r * balance) / monthlyPaymentOere;
		if (ratio >= 1) {
			// Payment doesn't cover interest – fall back to original remaining
			remainingMonths = Math.max(0, termMonths - steps);
		} else {
			remainingMonths = Math.ceil(-Math.log(1 - ratio) / Math.log(1 + r));
		}
	}

	const principalPaidPct = Math.max(
		0,
		Math.min(
			100,
			Math.round(((principalOere - balance) / principalOere) * 100),
		),
	);

	return {
		currentBalanceOere: Math.max(0, balance),
		monthlyPaymentOere,
		remainingMonths,
		principalPaidPct,
	};
}

export interface EarlyPayoffResult {
	regularMonths: number;
	newMonths: number;
	monthsSaved: number;
	interestSavedOere: number;
}

export function computeEarlyPayoff(
	currentBalanceOere: number,
	annualRatePct: number,
	regularMonthlyPaymentOere: number,
	extraMonthlyOere: number,
): EarlyPayoffResult | null {
	if (currentBalanceOere <= 0 || regularMonthlyPaymentOere <= 0) return null;

	const r = annualRatePct / 100 / 12;

	function monthsToPayoff(balance: number, payment: number): number | null {
		if (payment <= 0) return null;
		if (r === 0) return Math.ceil(balance / payment);
		const ratio = (r * balance) / payment;
		if (ratio >= 1) return null;
		return Math.ceil(-Math.log(1 - ratio) / Math.log(1 + r));
	}

	const regularMonths = monthsToPayoff(currentBalanceOere, regularMonthlyPaymentOere);
	if (regularMonths === null) return null;

	const newPayment = regularMonthlyPaymentOere + Math.max(0, extraMonthlyOere);
	const newMonths = monthsToPayoff(currentBalanceOere, newPayment) ?? regularMonths;

	const interestRegular = regularMonths * regularMonthlyPaymentOere - currentBalanceOere;
	const interestNew = newMonths * newPayment - currentBalanceOere;

	return {
		regularMonths,
		newMonths,
		monthsSaved: Math.max(0, regularMonths - newMonths),
		interestSavedOere: Math.max(0, interestRegular - interestNew),
	};
}
