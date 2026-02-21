"use client";

import { DeleteConfirmButton } from "@/components/delete-confirm-button";

interface DeleteIncomeButtonProps {
	deleteAction: () => Promise<void>;
}

export function DeleteIncomeButton({ deleteAction }: DeleteIncomeButtonProps) {
	return (
		<DeleteConfirmButton
			deleteAction={deleteAction}
			label="Slett inntekt"
			title="Slett inntekt"
			description="Er du sikker på at du vil slette denne inntekten? Denne handlingen kan ikke angres."
		/>
	);
}
