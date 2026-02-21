"use client";

import { addMonths, format, parseISO, subMonths } from "date-fns";
import { nb } from "date-fns/locale";
import {
	BarChart3,
	ChevronLeft,
	ChevronRight,
	PiggyBank,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatNOK } from "@/lib/format";

interface CategoryRow {
	categoryId: string | null;
	categoryName: string | null;
	total: number;
}

interface RecurringExpense {
	id: string;
	date: string;
	notes: string | null;
	amountOere: number;
	categoryName: string | null;
}

interface DashboardClientProps {
	selectedMonthStr: string;
	totalIncome: number;
	totalExpenses: number;
	savingsRate: number | null;
	categoryBreakdown: CategoryRow[];
	upcomingRecurring: RecurringExpense[];
	hasData: boolean;
	noAccountSelected: boolean;
	monthlySavings?: number;
	monthlyLoanTotal?: number;
	monthlyLoanInterest?: number;
	monthlyLoanPrincipal?: number;
}

export function DashboardClient({
	selectedMonthStr,
	totalIncome,
	totalExpenses,
	savingsRate,
	categoryBreakdown,
	upcomingRecurring,
	hasData,
	noAccountSelected,
	monthlySavings = 0,
	monthlyLoanTotal = 0,
	monthlyLoanInterest = 0,
	monthlyLoanPrincipal = 0,
}: DashboardClientProps) {
	const router = useRouter();

	const selectedMonth = parseISO(`${selectedMonthStr}-01`);
	const prevMonth = format(subMonths(selectedMonth, 1), "yyyy-MM");
	const nextMonth = format(addMonths(selectedMonth, 1), "yyyy-MM");
	const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: nb });
	const monthLabelDisplay =
		monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

	const netAmount = totalIncome - totalExpenses;

	if (noAccountSelected) {
		return (
			<div className="p-8">
				<div className="mb-8">
					<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
						Dashboard
					</h1>
				</div>
				<div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
					<Wallet className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
					<p className="text-base font-medium text-gray-500 dark:text-gray-400">
						Velg en konto for å se data
					</p>
					<p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
						Bruk kontovalgeren øverst for å velge hvilke kontoer som skal vises.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-8">
			{/* Header with month navigation */}
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
						Dashboard
					</h1>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						Månedlig oversikt
					</p>
				</div>

				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => router.push(`/dashboard?month=${prevMonth}`)}
						className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
						aria-label="Forrige måned"
					>
						<ChevronLeft className="h-4 w-4" />
					</button>
					<span className="min-w-[160px] text-center text-base font-semibold text-gray-900 dark:text-white">
						{monthLabelDisplay}
					</span>
					<button
						type="button"
						onClick={() => router.push(`/dashboard?month=${nextMonth}`)}
						className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
						aria-label="Neste måned"
					>
						<ChevronRight className="h-4 w-4" />
					</button>
				</div>
			</div>

			{/* Summary stat cards */}
			<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
				{/* Total income */}
				<div className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
					<div className="flex items-start justify-between">
						<div>
							<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
								Inntekt
							</p>
							<p className="mt-1 text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
								{formatNOK(totalIncome)}
							</p>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
							<TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
						</div>
					</div>
				</div>

				{/* Total expenses */}
				<div className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
					<div className="flex items-start justify-between">
						<div>
							<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
								Utgifter
							</p>
							<p className="mt-1 text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
								{formatNOK(totalExpenses)}
							</p>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
							<TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
						</div>
					</div>
				</div>

				{/* Savings rate */}
				<div className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
					<div className="flex items-start justify-between">
						<div>
							<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
								Sparerate
							</p>
							{savingsRate !== null ? (
								<p
									className={`mt-1 text-2xl font-bold tabular-nums ${
										savingsRate >= 0
											? "text-indigo-600 dark:text-indigo-400"
											: "text-red-600 dark:text-red-400"
									}`}
								>
									{savingsRate.toFixed(1)}%
								</p>
							) : (
								<p className="mt-1 text-2xl font-bold text-gray-400 dark:text-gray-500">
									—
								</p>
							)}
							<p className="mt-0.5 text-xs tabular-nums text-gray-400 dark:text-gray-500">
								Netto:{" "}
								<span
									className={
										netAmount >= 0
											? "text-green-600 dark:text-green-400"
											: "text-red-600 dark:text-red-400"
									}
								>
									{formatNOK(netAmount)}
								</span>
							</p>
						</div>
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
							<Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
						</div>
					</div>
				</div>
			</div>

			{/* Savings & loan cards */}
			{(monthlySavings > 0 || monthlyLoanTotal > 0) && (
				<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
					{/* Savings this month */}
					<div className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
									Spart denne måneden
								</p>
								<p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
									{formatNOK(monthlySavings)}
								</p>
							</div>
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
								<PiggyBank className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
							</div>
						</div>
					</div>

					{/* Loan payments this month */}
					<div className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
									Lån denne måneden
								</p>
								<p className="mt-1 text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
									{formatNOK(monthlyLoanTotal)}
								</p>
								{(monthlyLoanInterest > 0 || monthlyLoanPrincipal > 0) && (
									<p className="mt-0.5 text-xs tabular-nums text-gray-400 dark:text-gray-500">
										Renter: {formatNOK(monthlyLoanInterest)} · Avdrag:{" "}
										{formatNOK(monthlyLoanPrincipal)}
									</p>
								)}
							</div>
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
								<BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Empty state */}
			{!hasData && (
				<div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
					<TrendingDown className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
					<p className="text-base font-medium text-gray-500 dark:text-gray-400">
						Ingen data for {monthLabelDisplay}
					</p>
					<p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
						Legg til{" "}
						<Link
							href="/expenses/new"
							className="text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
						>
							utgifter
						</Link>{" "}
						eller{" "}
						<Link
							href="/income/new"
							className="text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
						>
							inntekter
						</Link>{" "}
						for å se oversikten.
					</p>
				</div>
			)}

			{hasData && (
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{/* Spending by category */}
					<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
						<div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
							<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
								Utgifter per kategori
							</h2>
						</div>
						{categoryBreakdown.length === 0 ? (
							<div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
								Ingen utgifter registrert
							</div>
						) : (
							<ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
								{categoryBreakdown.map((row, i) => {
									const pct =
										totalExpenses > 0
											? Math.round((row.total / totalExpenses) * 100)
											: 0;
									return (
										<li
											key={row.categoryId ?? `uncategorized-${i}`}
											className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
										>
											<div className="min-w-0 flex-1">
												<div className="flex items-center justify-between text-sm">
													<span className="truncate font-medium text-gray-700 dark:text-gray-200">
														{row.categoryName ?? "Ukategorisert"}
													</span>
													<span className="ml-4 flex-shrink-0 font-semibold tabular-nums text-red-600 dark:text-red-400">
														{formatNOK(row.total)}
													</span>
												</div>
												<div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
													<div
														className="h-full rounded-full bg-red-400 transition-all duration-500 ease-out dark:bg-red-500"
														style={{ width: `${pct}%` }}
													/>
												</div>
											</div>
											<span className="w-8 flex-shrink-0 text-right text-xs tabular-nums text-gray-400 dark:text-gray-500">
												{pct}%
											</span>
										</li>
									);
								})}
							</ul>
						)}
					</div>

					{/* Upcoming recurring expenses */}
					<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
						<div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
							<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
								Gjentagende utgifter denne måneden
							</h2>
						</div>
						{upcomingRecurring.length === 0 ? (
							<div className="px-5 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
								Ingen gjentagende utgifter
							</div>
						) : (
							<ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
								{upcomingRecurring.map((item) => (
									<li
										key={item.id}
										className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-700/30"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
												{item.notes ?? "Uten beskrivelse"}
											</p>
											<p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
												{format(parseISO(item.date), "d. MMMM", { locale: nb })}
												{item.categoryName ? ` · ${item.categoryName}` : ""}
											</p>
										</div>
										<span className="ml-4 flex-shrink-0 text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
											{formatNOK(item.amountOere)}
										</span>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
