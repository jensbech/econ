export function calcSavingsProjection(
	initialOere: number,
	monthlyContribOere: number,
	annualReturnPct: number,
	years: number,
): number {
	const months = years * 12;
	const r = annualReturnPct / 100 / 12;
	if (r === 0) {
		return initialOere + monthlyContribOere * months;
	}
	const growth = (1 + r) ** months;
	const result = Math.round(
		initialOere * growth + monthlyContribOere * ((growth - 1) / r),
	);
	return Number.isFinite(result) ? result : Number.MAX_SAFE_INTEGER;
}
