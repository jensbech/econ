export function formatNOK(oere: number): string {
	return new Intl.NumberFormat("nb-NO", {
		style: "currency",
		currency: "NOK",
		maximumFractionDigits: 0,
	}).format(oere / 100);
}
