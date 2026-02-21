import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { and, eq, isNull } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { loanPayments, loans } from "@/db/schema";
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

	// Fetch all payments for household loans via join
	const allPayments =
		allLoans.length > 0 && householdId
			? await db
					.select({
						loanId: loanPayments.loanId,
						date: loanPayments.date,
						amountOere: loanPayments.amountOere,
					})
					.from(loanPayments)
					.innerJoin(loans, eq(loanPayments.loanId, loans.id))
					.where(
						and(eq(loans.householdId, householdId), isNull(loans.deletedAt)),
					)
			: [];

	// Group payments by loan id
	const paymentsByLoan = new Map<
		string,
		Array<{ date: string; amountOere: number }>
	>();
	for (const p of allPayments) {
		const arr = paymentsByLoan.get(p.loanId) ?? [];
		arr.push({ date: p.date, amountOere: p.amountOere });
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
		),
	}));

	const totalBalance = loansWithBalance.reduce(
		(sum, { balance }) => sum + balance.currentBalanceOere,
		0,
	);

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
						Lån
					</h2>
					{allLoans.length > 0 && (
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Total gjeld:{" "}
							<span className="font-medium text-red-600 dark:text-red-400">
								{formatNOK(totalBalance)}
							</span>
						</p>
					)}
				</div>
				<Link
					href="/loans/new"
					className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
				>
					<Plus className="h-4 w-4" />
					Legg til lån
				</Link>
			</div>

			{allLoans.length === 0 ? (
				<div className="rounded-xl border border-dashed border-gray-200 py-20 text-center dark:border-gray-700">
					<p className="text-gray-400 dark:text-gray-500">Ingen lån ennå</p>
					<p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
						Legg til et lån for å spore nedbetalingen.
					</p>
					<Link
						href="/loans/new"
						className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
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
								className="block rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
							>
								<div className="mb-4 flex items-start justify-between">
									<div>
										<h3 className="font-semibold text-gray-900 dark:text-white">
											{loan.name}
										</h3>
										<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
											{LOAN_TYPE_LABELS[loan.type] ?? loan.type} · Startet{" "}
											{format(parseISO(loan.startDate), "MMM yyyy", {
												locale: nb,
											})}
										</p>
									</div>
									<span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
										{loan.interestRate}%
									</span>
								</div>

								{/* Balance */}
								<p className="text-2xl font-bold text-red-600 dark:text-red-400">
									{formatNOK(balance.currentBalanceOere)}
								</p>
								<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
									gjenstående av {formatNOK(loan.principalOere)}
								</p>

								{/* Progress bar */}
								<div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
									<div
										className="h-full rounded-full bg-indigo-500 transition-all"
										style={{ width: `${balance.principalPaidPct}%` }}
									/>
								</div>
								<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
									{balance.principalPaidPct}% nedbetalt
								</p>

								{/* Footer stats */}
								<div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-400">
									<div>
										<span className="block font-medium text-gray-900 dark:text-white">
											{formatNOK(balance.monthlyPaymentOere)}
										</span>
										<span>/ mnd</span>
									</div>
									<div className="text-right">
										<span className="block font-medium text-gray-900 dark:text-white">
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
