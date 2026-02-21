"use client";

import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { PiggyBank, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { formatNOK } from "@/lib/format";

interface SavingsAccountCardProps {
	account: {
		id: string;
		name: string;
		targetOere: number | null;
		targetDate: string | null;
	};
	balance: number;
	recentTransactions: Array<{
		date: string;
		notes: string | null;
		amountOere: number;
	}>;
	deleteAction: () => Promise<void>;
}

export function SavingsAccountCard({
	account,
	balance,
	recentTransactions,
	deleteAction,
}: SavingsAccountCardProps) {
	const hasTarget = account.targetOere !== null && account.targetOere > 0;
	const pct =
		hasTarget && account.targetOere
			? Math.min(100, Math.round((balance / account.targetOere) * 100))
			: null;

	return (
		<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
			{/* Header */}
			<div className="mb-4 flex items-start justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<PiggyBank className="h-5 w-5 flex-shrink-0 text-indigo-500" />
					<div className="min-w-0">
						<h3 className="truncate font-semibold text-gray-900 dark:text-white">
							{account.name}
						</h3>
						{account.targetDate && (
							<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
								Mål:{" "}
								{format(parseISO(account.targetDate), "d. MMMM yyyy", {
									locale: nb,
								})}
							</p>
						)}
					</div>
				</div>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 flex-shrink-0 text-gray-400 hover:text-red-600"
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Slett sparekonto?</AlertDialogTitle>
							<AlertDialogDescription>
								Er du sikker på at du vil slette &laquo;{account.name}&raquo;?
								Utgifter koblet til denne kontoen beholdes, men mister
								tilknytningen.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Avbryt</AlertDialogCancel>
							<AlertDialogAction
								onClick={async () => {
									await deleteAction();
								}}
								className="bg-red-600 hover:bg-red-700"
							>
								Slett
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>

			{/* Balance */}
			<div className="mb-3">
				<span className="text-2xl font-bold text-green-600 dark:text-green-400">
					{formatNOK(balance)}
				</span>
				{hasTarget && account.targetOere && (
					<span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
						av {formatNOK(account.targetOere)}
					</span>
				)}
			</div>

			{/* Progress bar — only when target is set */}
			{pct !== null && (
				<>
					<div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
						<div
							className={`h-full rounded-full transition-all ${
								pct >= 100 ? "bg-green-500" : "bg-indigo-500"
							}`}
							style={{ width: `${pct}%` }}
						/>
					</div>
					<p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
						{pct}% av mål
					</p>
				</>
			)}

			{/* Recent transactions */}
			{recentTransactions.length > 0 && (
				<div className="border-t border-gray-100 pt-3 dark:border-gray-800">
					<p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
						Siste transaksjoner
					</p>
					<ul className="space-y-1.5">
						{recentTransactions.map((tx, i) => (
							<li
								key={`${tx.date}-${i}`}
								className="flex items-center justify-between text-xs"
							>
								<span className="text-gray-600 dark:text-gray-400">
									{format(parseISO(tx.date), "d. MMM", { locale: nb })}
									{tx.notes ? ` — ${tx.notes}` : ""}
								</span>
								<span className="font-medium tabular-nums text-green-600 dark:text-green-400">
									{formatNOK(tx.amountOere)}
								</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{recentTransactions.length === 0 && (
				<p className="text-xs text-gray-400 dark:text-gray-500">
					Ingen transaksjoner ennå. Registrer en utgift med &laquo;Sparing&raquo;-kategorien.
				</p>
			)}
		</div>
	);
}
