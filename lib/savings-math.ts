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
	return Math.round(
		initialOere * growth + monthlyContribOere * ((growth - 1) / r),
	);
}
