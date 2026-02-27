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
	openingBalanceDate?: string;
	hasOpeningBalance?: boolean;
	coinSymbol?: string;
	coinQuantity?: number;
	livePriceAvailable?: boolean;
}

export function SavingsAccountCard({
	account,
	balance,
	recentTransactions,
	openingBalanceDate,
	hasOpeningBalance = false,
	coinSymbol,
	coinQuantity,
	livePriceAvailable,
}: SavingsAccountCardProps) {
	const isCrypto = coinSymbol != null;

	return (
		<div className="rounded-xl border border-border bg-card p-5 dark:border-border/40 dark:bg-card">
			{/* Header */}
			<div className="mb-4 flex items-start justify-between gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<PiggyBank className="h-5 w-5 flex-shrink-0 text-foreground/50 dark:text-foreground/60" />
					<div className="min-w-0">
						<h3 className="truncate font-semibold text-foreground dark:text-card-foreground">
							{account.name}
						</h3>
						{isCrypto ? (
							<div className="mt-0.5 flex items-center gap-1.5">
								<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
									{coinSymbol}
								</span>
								{coinQuantity != null && (
									<span className="text-xs text-foreground/50">
										{coinQuantity} {coinSymbol}
									</span>
								)}
							</div>
						) : (
							openingBalanceDate && (
								<p className="mt-0.5 text-xs text-foreground/50 dark:text-foreground/60">
									Saldo fra {format(parseISO(openingBalanceDate), "d. MMM yyyy", { locale: nb })}
								</p>
							)
						)}
					</div>
				</div>
			</div>

			{/* Balance */}
			<div className="mb-4">
				<span className="text-2xl font-bold text-primary">
					{formatNOK(balance)}
				</span>
			</div>

			{/* Recent transactions (only for non-crypto) */}
			{!isCrypto && recentTransactions.length > 0 && (
				<div className="border-t border-gray-100 pt-3 dark:border-border/40">
					<p className="mb-2 text-xs font-medium text-foreground/60 dark:text-foreground/50">
						Siste transaksjoner
					</p>
					<ul className="space-y-1.5">
						{recentTransactions.map((tx, i) => (
							<li
								key={`${tx.date}-${i}`}
								className="flex items-center justify-between text-xs"
							>
								<span className="text-foreground/70 dark:text-foreground/50">
									{format(parseISO(tx.date), "d. MMM", { locale: nb })}
									{tx.notes ? ` — ${tx.notes}` : ""}
								</span>
								<span
									className={`font-medium tabular-nums ${
										tx.type === "income"
											? "text-primary"
											: "text-destructive"
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

			{!isCrypto && recentTransactions.length === 0 && (
				<p className="text-xs text-foreground/50 dark:text-foreground/60">
					Ingen transaksjoner ennå. Registrer inntekt eller utgifter koblet til
					denne kontoen.
				</p>
			)}

			{isCrypto && livePriceAvailable === false && (
				<p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
					Live kurs ikke tilgjengelig. Sjekk internettforbindelsen.
				</p>
			)}

			{!isCrypto && !hasOpeningBalance && (
				<p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
					Saldo beregnes fra alle importerte transaksjoner. Sett startsaldo for korrekt beregning.
				</p>
			)}
		</div>
	);
}
