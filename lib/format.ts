export function formatNOK(oere: number): string {
	return new Intl.NumberFormat("nb-NO", {
		style: "currency",
		currency: "NOK",
	}).format(oere / 100);
}
