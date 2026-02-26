"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteLoan, deleteLoanPayment } from "../actions";

export function DeleteLoanButton({ loanId }: { loanId: string }) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<button
					type="button"
					className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
				>
					Slett lån
				</button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Slett lån</AlertDialogTitle>
					<AlertDialogDescription>
						Er du sikker på at du vil slette dette lånet? Alle registrerte
						betalinger vil også slettes. Denne handlingen kan ikke angres.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Avbryt</AlertDialogCancel>
					<form action={deleteLoan.bind(null, loanId)}>
						<AlertDialogAction type="submit" className="bg-red-600 hover:bg-red-700">
							Slett
						</AlertDialogAction>
					</form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function DeletePaymentButton({
	paymentId,
	loanId,
}: {
	paymentId: string;
	loanId: string;
}) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<button
					type="button"
					className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
				>
					Slett
				</button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Slett betaling</AlertDialogTitle>
					<AlertDialogDescription>
						Er du sikker på at du vil slette denne betalingen?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Avbryt</AlertDialogCancel>
					<form action={deleteLoanPayment.bind(null, paymentId, loanId)}>
						<AlertDialogAction type="submit" className="bg-red-600 hover:bg-red-700">
							Slett
						</AlertDialogAction>
					</form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
