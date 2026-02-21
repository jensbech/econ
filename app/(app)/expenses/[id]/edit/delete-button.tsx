"use client";

import { DeleteConfirmButton } from "@/components/delete-confirm-button";

interface DeleteExpenseButtonProps {
	deleteAction: () => Promise<void>;
}

export function DeleteExpenseButton({
	deleteAction,
}: DeleteExpenseButtonProps) {
	return (
		<DeleteConfirmButton
			deleteAction={deleteAction}
			label="Slett utgift"
			title="Slett utgift"
			description="Er du sikker på at du vil slette denne utgiften? Denne handlingen kan ikke angres."
		/>
	);
}
