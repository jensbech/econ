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
	earliestDataDate?: string | null;
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
	earliestDataDate,
	activeTab = "summary",
}: DashboardClientProps) {
	const selectedMonth = parseISO(`${selectedMonthStr}-01`);
	const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: nb });
	const monthLabelDisplay =
		monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

	const netAmount = totalIncome - totalExpenses;

	if (noAccountSelected) {
		return (
			<div className="p-4 sm:p-6 lg:p-8">
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
		"pb-3 text-sm font-medium transition-colors border-b-2 -mb-px";
	const tabActive =
		"border-gray-900 text-gray-900 dark:border-white dark:text-white";
	const tabInactive =
		"border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600";

	return (
		<div className="p-4 sm:p-6 lg:p-8">
			{/* Header */}
			<div className="mb-1">
				<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
					Oversikt
				</h1>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					{monthLabelDisplay}
				</p>
			</div>

			{/* Tabs */}
			<div className="mb-6 mt-4 flex gap-6 border-b border-gray-200 dark:border-gray-800">
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
							className="animate-card-in rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
							style={{ animationDelay: "0ms" }}
						>
							<div className="flex items-start justify-between p-5">
								<div>
									<p className="text-xs font-medium text-gray-400 dark:text-gray-500">
										Inntekt
									</p>
									<p className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-green-600 dark:text-green-400">
										{formatNOK(totalIncome)}
									</p>
								</div>
								<TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500 dark:text-green-400" />
							</div>
						</div>

						{/* Total expenses */}
						<div
							className="animate-card-in rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
							style={{ animationDelay: "60ms" }}
						>
							<div className="flex items-start justify-between p-5">
								<div>
									<p className="text-xs font-medium text-gray-400 dark:text-gray-500">
										Utgifter
									</p>
									<p className="mt-1.5 font-mono text-3xl font-bold tabular-nums text-red-600 dark:text-red-400">
										{formatNOK(totalExpenses)}
									</p>
								</div>
								<TrendingDown className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" />
							</div>
						</div>

						{/* Savings rate */}
						<div
							className="animate-card-in rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
							style={{ animationDelay: "120ms" }}
						>
							<div className="flex items-start justify-between p-5">
								<div>
									<p className="text-xs font-medium text-gray-400 dark:text-gray-500">
										Sparerate
									</p>
									{savingsRate !== null ? (
										<p
											className={`mt-1.5 font-mono text-3xl font-bold tabular-nums ${
												savingsRate >= 0
													? "text-green-600 dark:text-green-400"
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
								<Wallet className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
							</div>
						</div>
					</div>

					{/* Data completeness banner */}
					{earliestDataDate && (
						<div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-300">
							Viser data fra {format(parseISO(earliestDataDate), "d. MMMM yyyy", { locale: nb })}. Eldre transaksjoner er ikke registrert.
						</div>
					)}

					{/* Loan card */}
					{monthlyLoanTotal > 0 && (
						<div className="mb-8">
							<div
								className="animate-card-in rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
								style={{ animationDelay: "180ms" }}
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
									<BarChart3 className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500 dark:text-amber-400" />
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
									className="underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 dark:decoration-gray-500 dark:hover:decoration-gray-300"
								>
									utgifter
								</Link>{" "}
								eller{" "}
								<Link
									href="/income/new"
									className="underline underline-offset-2 decoration-gray-400 hover:decoration-gray-600 dark:decoration-gray-500 dark:hover:decoration-gray-300"
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
							<ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
								{(() => {
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
														<div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
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
								style={{ animationDelay: "200ms" }}
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
									<ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
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
							<div
								className="animate-card-in rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
								style={{ animationDelay: "260ms" }}
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
									<ul className="divide-y divide-gray-100 dark:divide-gray-700/50">
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
