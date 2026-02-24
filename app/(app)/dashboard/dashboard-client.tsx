"use client";

import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { BarChart3, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { ChartsClient } from "@/app/(app)/charts/charts-client";
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

interface MonthlyData {
	month: string;
	expenses: number;
	income: number;
}

interface BudgetRow {
	categoryId: string | null;
	categoryName: string | null;
	total: number;
}

interface DashboardClientProps {
	selectedMonthStr: string;
	totalIncome: number;
	totalExpenses: number;
	savingsRate: number | null;
	categoryBreakdown: CategoryRow[];
	upcomingRecurring: RecurringExpense[];
	trendData: MonthlyData[];
	budgetByCategory?: BudgetRow[];
	hasData: boolean;
	noAccountSelected: boolean;
	monthlyLoanTotal?: number;
	monthlyLoanInterest?: number;
	monthlyLoanPrincipal?: number;
	activeTab?: "summary" | "grafer";
}

export function DashboardClient({
	selectedMonthStr,
	totalIncome,
	totalExpenses,
	savingsRate,
	categoryBreakdown,
	upcomingRecurring,
	trendData,
	budgetByCategory = [],
	hasData,
	noAccountSelected,
	monthlyLoanTotal = 0,
	monthlyLoanInterest = 0,
	monthlyLoanPrincipal = 0,
	activeTab = "summary",
}: DashboardClientProps) {
	const selectedMonth = parseISO(`${selectedMonthStr}-01`);
	const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: nb });
	const monthLabelDisplay =
		monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

	const netAmount = totalIncome - totalExpenses;

	if (noAccountSelected) {
		return (
			<div className="p-8">
				<div className="mb-8">
					<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
						Oversikt
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

	const tabBase =
		"px-4 py-2 text-sm font-medium transition-colors rounded-lg";
	const tabActive =
		"bg-indigo-600 text-white";
	const tabInactive =
		"text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800";

	return (
		<div className="p-8">
			{/* Header */}
			<div className="mb-6">
				<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
					Oversikt
				</h1>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{monthLabelDisplay}
				</p>
			</div>

			{/* Tabs */}
			<div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit dark:border-gray-700 dark:bg-gray-800/50">
				<Link
					href="/dashboard"
					className={`${tabBase} ${activeTab === "summary" ? tabActive : tabInactive}`}
				>
					Sammendrag
				</Link>
				<Link
					href="/dashboard?tab=grafer"
					className={`${tabBase} ${activeTab === "grafer" ? tabActive : tabInactive}`}
				>
					Grafer
				</Link>
			</div>

			{activeTab === "grafer" ? (
				<ChartsClient
					selectedMonthStr={selectedMonthStr}
					categoryBreakdown={categoryBreakdown}
					trendData={trendData}
				/>
			) : (
				<>
					{/* Summary stat cards */}
					<div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
						{/* Total income */}
						<div
							className="animate-card-in overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
							style={{ animationDelay: "0ms" }}
						>
							<div className="h-1 bg-green-400 dark:bg-green-500" />
							<div className="flex items-start justify-between p-5">
								<div>
									<p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
										Inntekt
									</p>
									<p className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-green-600 dark:text-green-400">
										{formatNOK(totalIncome)}
									</p>
								</div>
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
									<TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
								</div>
							</div>
						</div>

						{/* Total expenses */}
						<div
							className="animate-card-in overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
							style={{ animationDelay: "80ms" }}
						>
							<div className="h-1 bg-red-400 dark:bg-red-500" />
							<div className="flex items-start justify-between p-5">
								<div>
									<p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
										Utgifter
									</p>
									<p className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-red-600 dark:text-red-400">
										{formatNOK(totalExpenses)}
									</p>
								</div>
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
									<TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
								</div>
							</div>
						</div>

						{/* Savings rate */}
						<div
							className="animate-card-in overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
							style={{ animationDelay: "160ms" }}
						>
							<div className={`h-1 ${savingsRate !== null && savingsRate >= 0 ? "bg-indigo-400 dark:bg-indigo-500" : "bg-red-400 dark:bg-red-500"}`} />
							<div className="flex items-start justify-between p-5">
								<div>
									<p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
										Sparerate
									</p>
									{savingsRate !== null ? (
										<p
											className={`mt-1.5 font-mono text-3xl font-bold tabular-nums ${
												savingsRate >= 0
													? "text-indigo-600 dark:text-indigo-400"
													: "text-red-600 dark:text-red-400"
											}`}
										>
											{savingsRate.toFixed(1)}%
										</p>
									) : (
										<p className="mt-1.5 font-mono text-3xl font-bold text-gray-400 dark:text-gray-500">
											—
										</p>
									)}
									<p className="mt-0.5 font-mono text-xs tabular-nums text-gray-400 dark:text-gray-500">
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
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
									<Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
								</div>
							</div>
						</div>
					</div>

					{/* Loan card */}
					{monthlyLoanTotal > 0 && (
						<div className="mb-8">
							<div
							className="animate-card-in rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
							style={{ animationDelay: "240ms" }}
						>
								<div className="flex items-start justify-between">
									<div>
										<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
											Lån denne måneden
										</p>
										<p className="mt-1 font-mono text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
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

					{/* Budget vs. actual */}
					{budgetByCategory.length > 0 && (
						<div className="mb-8 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
							<div className="border-b border-gray-100 px-5 py-4 dark:border-gray-700">
								<h2 className="text-sm font-semibold text-gray-900 dark:text-white">
									Budsjett vs. faktisk
								</h2>
							</div>
							<ul className="divide-y divide-gray-50 dark:divide-gray-700/50">
								{(() => {
									// Merge budget and actual by categoryId
									const allIds = new Set([
										...budgetByCategory.map((b) => b.categoryId ?? "__none__"),
										...categoryBreakdown.map((a) => a.categoryId ?? "__none__"),
									]);
									return Array.from(allIds).map((id) => {
										const budget = budgetByCategory.find(
											(b) => (b.categoryId ?? "__none__") === id,
										);
										const actual = categoryBreakdown.find(
											(a) => (a.categoryId ?? "__none__") === id,
										);
										const budgetAmt = budget?.total ?? 0;
										const actualAmt = actual?.total ?? 0;
										const name =
											budget?.categoryName ??
											actual?.categoryName ??
											"Ukategorisert";
										const over = budgetAmt > 0 && actualAmt > budgetAmt;
										const under = budgetAmt > 0 && actualAmt <= budgetAmt;
										return (
											<li
												key={id}
												className="flex items-center justify-between px-5 py-3"
											>
												<div className="min-w-0 flex-1">
													<span className="text-sm font-medium text-gray-700 dark:text-gray-200">
														{name}
													</span>
													{budgetAmt > 0 && (
														<div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
															<div
																className={`h-full rounded-full transition-all duration-500 ${over ? "bg-red-400 dark:bg-red-500" : "bg-green-400 dark:bg-green-500"}`}
																style={{
																	width: `${Math.min(100, Math.round((actualAmt / budgetAmt) * 100))}%`,
																}}
															/>
														</div>
													)}
												</div>
												<div className="ml-4 flex-shrink-0 text-right">
													<span
														className={`text-sm font-semibold tabular-nums ${over ? "text-red-600 dark:text-red-400" : under ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}`}
													>
														{formatNOK(actualAmt)}
													</span>
													{budgetAmt > 0 && (
														<span className="block text-xs text-gray-400 dark:text-gray-500">
															av {formatNOK(budgetAmt)}
														</span>
													)}
												</div>
											</li>
										);
									});
								})()}
							</ul>
						</div>
					)}

					{hasData && (
						<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
							{/* Spending by category */}
							<div
								className="animate-card-in rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
								style={{ animationDelay: "300ms" }}
							>
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
														<div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
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
							<div
								className="animate-card-in rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
								style={{ animationDelay: "380ms" }}
							>
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
														{format(parseISO(item.date), "d. MMMM", {
															locale: nb,
														})}
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
				</>
			)}
		</div>
	);
}
