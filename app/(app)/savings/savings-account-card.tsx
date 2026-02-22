"use client";

import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { PiggyBank } from "lucide-react";
import { formatNOK } from "@/lib/format";

interface SavingsAccountCardProps {
	account: {
		id: string;
		name: string;
	};
	balance: number;
	recentTransactions: Array<{
		date: string;
		notes: string | null;
		amount: number;
		type: "income" | "expense";
	}>;
}

export function SavingsAccountCard({
	account,
	balance,
	recentTransactions,
}: SavingsAccountCardProps) {
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
					</div>
				</div>
			</div>

			{/* Balance */}
			<div className="mb-4">
				<span className="text-2xl font-bold text-green-600 dark:text-green-400">
					{formatNOK(balance)}
				</span>
			</div>

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
								<span
									className={`font-medium tabular-nums ${
										tx.type === "income"
											? "text-green-600 dark:text-green-400"
											: "text-red-600 dark:text-red-400"
									}`}
								>
									{tx.type === "income" ? "+" : "−"}
									{formatNOK(Math.abs(tx.amount))}
								</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{recentTransactions.length === 0 && (
				<p className="text-xs text-gray-400 dark:text-gray-500">
					Ingen transaksjoner ennå. Registrer inntekt eller utgifter koblet til
					denne kontoen.
				</p>
			)}
		</div>
	);
}
