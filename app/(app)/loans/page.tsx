import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { expenses, loans } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { formatNOK } from "@/lib/format";
import { getHouseholdId } from "@/lib/households";
import { computeLoanBalance } from "@/lib/loan-math";

const LOAN_TYPE_LABELS: Record<string, string> = {
	mortgage: "Boliglån",
	student: "Studielån",
	car: "Billån",
	consumer: "Forbrukslån",
	other: "Annet",
};

export default async function LoansPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const allLoans = householdId
		? await db
				.select()
				.from(loans)
				.where(and(eq(loans.householdId, householdId), isNull(loans.deletedAt)))
		: [];

	// Fetch all expense-based payments for household loans
	const allPayments =
		allLoans.length > 0 && householdId
			? await db
					.select({
						loanId: expenses.loanId,
						date: expenses.date,
						amountOere: expenses.amountOere,
						principalOere: expenses.principalOere,
					})
					.from(expenses)
					.where(
						and(
							eq(expenses.householdId, householdId),
							isNull(expenses.deletedAt),
							isNotNull(expenses.loanId),
						),
					)
			: [];

	// Filter to only loan-linked expenses and group by loan id
	const paymentsByLoan = new Map<
		string,
		Array<{ date: string; amountOere: number }>
	>();
	for (const p of allPayments) {
		if (!p.loanId) continue;
		const arr = paymentsByLoan.get(p.loanId) ?? [];
		// Use principalOere if available, otherwise amountOere
		arr.push({ date: p.date, amountOere: p.principalOere ?? p.amountOere });
		paymentsByLoan.set(p.loanId, arr);
	}

	const loansWithBalance = allLoans.map((loan) => ({
		loan,
		balance: computeLoanBalance(
			loan.principalOere,
			loan.interestRate,
			loan.termMonths,
			loan.startDate,
			paymentsByLoan.get(loan.id) ?? [],
			loan.openingBalanceOere,
			loan.openingBalanceDate,
		),
	}));

	const totalBalance = loansWithBalance.reduce(
		(sum, { balance }) => sum + balance.currentBalanceOere,
		0,
	);

	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
						Lån
					</h2>
					{allLoans.length > 0 && (
						<p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
							Total gjeld:{" "}
							<span className="font-medium text-destructive">
								{formatNOK(totalBalance)}
							</span>
						</p>
					)}
				</div>
				<Link
					href="/loans/new"
					className="inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
				>
					<Plus className="h-4 w-4" />
					Legg til lån
				</Link>
			</div>

			{allLoans.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border py-20 text-center dark:border-border/40">
					<p className="text-foreground/50 dark:text-foreground/60">Ingen lån ennå</p>
					<p className="mt-1 text-sm text-foreground/50 dark:text-foreground/60">
						Legg til et lån for å spore nedbetalingen.
					</p>
					<Link
						href="/loans/new"
						className="mt-4 inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
					>
						<Plus className="h-4 w-4" />
						Legg til lån
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
					{loansWithBalance.map(({ loan, balance }) => {
						const remainingYears = Math.floor(balance.remainingMonths / 12);
						const remainingMo = balance.remainingMonths % 12;

						return (
							<Link
								key={loan.id}
								href={`/loans/${loan.id}`}
								className="block rounded-xl border border-border bg-card p-5 transition-colors hover:bg-background/50 dark:border-border/40 dark:bg-card dark:hover:bg-card/50"
							>
								<div className="mb-4 flex items-start justify-between">
									<div>
										<h3 className="font-semibold text-foreground dark:text-card-foreground">
											{loan.name}
										</h3>
										<p className="mt-0.5 text-xs text-foreground/60 dark:text-foreground/50">
											{LOAN_TYPE_LABELS[loan.type] ?? loan.type} · Startet{" "}
											{format(parseISO(loan.startDate), "MMM yyyy", {
												locale: nb,
											})}
										</p>
									</div>
									<span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground/60 dark:border-border/40 dark:text-foreground/50">
										{loan.interestRate}%
									</span>
								</div>

								{/* Balance */}
								<p className="text-2xl font-bold text-destructive">
									{formatNOK(balance.currentBalanceOere)}
								</p>
								<p className="mt-0.5 text-xs text-foreground/60 dark:text-foreground/50">
									gjenstående av {formatNOK(loan.principalOere)}
								</p>

								{/* Progress bar */}
								<div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-primary/8 dark:bg-card">
									<div
										className="h-full rounded-full bg-background0 dark:bg-gray-400 transition-all"
										style={{ width: `${balance.principalPaidPct}%` }}
									/>
								</div>
								<div className="mt-1 flex items-center justify-between">
									<p className="text-xs text-foreground/60 dark:text-foreground/50">
										{balance.principalPaidPct}% nedbetalt
									</p>
									<p className="text-xs text-foreground/50 dark:text-foreground/60">
										{100 - balance.principalPaidPct}% igjen
									</p>
								</div>

								{/* Footer stats */}
								<div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-xs text-foreground/70 dark:border-border/40 dark:text-foreground/50">
									<div>
										<span className="block font-medium text-foreground dark:text-card-foreground">
											{formatNOK(balance.monthlyPaymentOere)}
										</span>
										<span>/ mnd</span>
									</div>
									<div className="text-right">
										<span className="block font-medium text-foreground dark:text-card-foreground">
											{balance.remainingMonths === 0
												? "Nedbetalt"
												: remainingYears > 0
													? `${remainingYears} år ${remainingMo > 0 ? `${remainingMo} mnd` : ""}`
													: `${balance.remainingMonths} mnd`}
										</span>
										<span>gjenstår</span>
									</div>
								</div>
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}
