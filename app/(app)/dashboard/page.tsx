import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { and, eq, gte, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { categories, expenses, incomeEntries, recurringTemplates } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import {
	expandRecurringExpenses,
	expandRecurringIncome,
} from "@/lib/expand-recurring";
import { getHouseholdId } from "@/lib/households";
import { getFilteredAccountIds } from "@/lib/accounts";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage({
	searchParams,
}: {
	searchParams: Promise<{ month?: string; tab?: string }>;
}) {
	const params = await searchParams;
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	// Resolve selected account IDs from cookie
	const cookieStore = await cookies();
	const selectedRaw = cookieStore.get("selectedAccounts")?.value ?? "";
	const selectedIds = selectedRaw.split(",").filter(Boolean);

	// Parse month: searchParam overrides cookie, cookie overrides current month
	const monthCookie = cookieStore.get("selectedMonth")?.value;
	const monthStr = params.month ?? monthCookie;
	let selectedMonth: Date;
	if (monthStr) {
		const [yearStr, monStr] = monthStr.split("-");
		selectedMonth = new Date(
			Number.parseInt(yearStr, 10),
			Number.parseInt(monStr, 10) - 1,
			1,
		);
	} else {
		const now = new Date();
		selectedMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	}

	const activeTab = params.tab === "grafer" ? "grafer" : "summary";
	const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
	const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");
	const sixMonthsAgoStart = format(
		startOfMonth(subMonths(selectedMonth, 5)),
		"yyyy-MM-dd",
	);

	// Expand recurring entries for this month (idempotent)
	if (householdId) {
		await Promise.all([
			expandRecurringExpenses(householdId, selectedMonth),
			expandRecurringIncome(householdId, selectedMonth),
		]);
	}

	if (!householdId) {
		return (
			<DashboardClient
				selectedMonthStr={format(selectedMonth, "yyyy-MM")}
				totalIncome={0}
				totalExpenses={0}
				savingsRate={null}
				categoryBreakdown={[]}
				upcomingRecurring={[]}
				trendData={[]}
				budgetByCategory={[]}
				hasData={false}
				noAccountSelected={true}
				activeTab={activeTab}
			/>
		);
	}

	// Empty selection = all public accounts; explicit selection = those accounts only
	const validIds = await getFilteredAccountIds(user.id as string, householdId, selectedIds);

	if (validIds.length === 0) {
		return (
			<DashboardClient
				selectedMonthStr={format(selectedMonth, "yyyy-MM")}
				totalIncome={0}
				totalExpenses={0}
				savingsRate={null}
				categoryBreakdown={[]}
				upcomingRecurring={[]}
				trendData={[]}
				budgetByCategory={[]}
				hasData={false}
				noAccountSelected={true}
				activeTab={activeTab}
			/>
		);
	}

	const [expenseRows, incomeRows, categoryBreakdown, upcomingRecurring, loanRows, monthlyExpenses, monthlyIncome, budgetRows] =
		await Promise.all([
			// All expenses for the month (just amounts)
			db
				.select({ amountOere: expenses.amountOere })
				.from(expenses)
				.where(
					and(
						eq(expenses.householdId, householdId),
						isNull(expenses.deletedAt),
						gte(expenses.date, monthStart),
						lte(expenses.date, monthEnd),
						or(isNull(expenses.accountId), inArray(expenses.accountId, validIds)),
					),
				),

			// All income for the month (just amounts)
			db
				.select({ amountOere: incomeEntries.amountOere })
				.from(incomeEntries)
				.where(
					and(
						eq(incomeEntries.householdId, householdId),
						isNull(incomeEntries.deletedAt),
						gte(incomeEntries.date, monthStart),
						lte(incomeEntries.date, monthEnd),
						or(isNull(incomeEntries.accountId), inArray(incomeEntries.accountId, validIds)),
					),
				),

			// Expenses grouped by category
			db
				.select({
					categoryId: expenses.categoryId,
					categoryName: categories.name,
					total: sql<number>`sum(${expenses.amountOere})::int`,
				})
				.from(expenses)
				.leftJoin(
					categories,
					and(
						eq(expenses.categoryId, categories.id),
						eq(categories.householdId, householdId),
					),
				)
				.where(
					and(
						eq(expenses.householdId, householdId),
						isNull(expenses.deletedAt),
						gte(expenses.date, monthStart),
						lte(expenses.date, monthEnd),
						or(isNull(expenses.accountId), inArray(expenses.accountId, validIds)),
					),
				)
				.groupBy(expenses.categoryId, categories.name)
				.orderBy(sql`sum(${expenses.amountOere}) desc`),

			// Recurring expenses for the month
			db
				.select({
					id: expenses.id,
					date: expenses.date,
					notes: expenses.notes,
					amountOere: expenses.amountOere,
					categoryName: categories.name,
				})
				.from(expenses)
				.leftJoin(
					categories,
					and(
						eq(expenses.categoryId, categories.id),
						eq(categories.householdId, householdId),
					),
				)
				.where(
					and(
						eq(expenses.householdId, householdId),
						isNull(expenses.deletedAt),
						gte(expenses.date, monthStart),
						lte(expenses.date, monthEnd),
						isNotNull(expenses.recurringTemplateId),
						or(isNull(expenses.accountId), inArray(expenses.accountId, validIds)),
					),
				)
				.orderBy(expenses.date),

			db
				.select({
					amountOere: expenses.amountOere,
					interestOere: expenses.interestOere,
					principalOere: expenses.principalOere,
				})
				.from(expenses)
				.where(
					and(
						eq(expenses.householdId, householdId),
						isNull(expenses.deletedAt),
						gte(expenses.date, monthStart),
						lte(expenses.date, monthEnd),
						or(isNull(expenses.accountId), inArray(expenses.accountId, validIds)),
						isNotNull(expenses.loanId),
					),
				),

		// Monthly expense totals for 6-month trend
		db
			.select({
				month: sql<string>`to_char(${expenses.date}::date, 'YYYY-MM')`,
				total: sql<number>`sum(${expenses.amountOere})::int`,
			})
			.from(expenses)
			.where(
				and(
					eq(expenses.householdId, householdId),
					isNull(expenses.deletedAt),
					gte(expenses.date, sixMonthsAgoStart),
					lte(expenses.date, monthEnd),
					or(isNull(expenses.accountId), inArray(expenses.accountId, validIds)),
				),
			)
			.groupBy(sql`to_char(${expenses.date}::date, 'YYYY-MM')`)
			.orderBy(sql`to_char(${expenses.date}::date, 'YYYY-MM')`),

		// Monthly income totals for 6-month trend
		db
			.select({
				month: sql<string>`to_char(${incomeEntries.date}::date, 'YYYY-MM')`,
				total: sql<number>`sum(${incomeEntries.amountOere})::int`,
			})
			.from(incomeEntries)
			.where(
				and(
					eq(incomeEntries.householdId, householdId),
					isNull(incomeEntries.deletedAt),
					gte(incomeEntries.date, sixMonthsAgoStart),
					lte(incomeEntries.date, monthEnd),
					or(
						isNull(incomeEntries.accountId),
						inArray(incomeEntries.accountId, validIds),
					),
				),
			)
			.groupBy(sql`to_char(${incomeEntries.date}::date, 'YYYY-MM')`)
			.orderBy(sql`to_char(${incomeEntries.date}::date, 'YYYY-MM')`),

		// Active recurring expense templates for budget comparison
		db
			.select({
				categoryId: recurringTemplates.categoryId,
				categoryName: categories.name,
				total: sql<number>`sum(${recurringTemplates.amountOere})::int`,
			})
			.from(recurringTemplates)
			.leftJoin(
				categories,
				and(
					eq(recurringTemplates.categoryId, categories.id),
					eq(categories.householdId, householdId),
				),
			)
			.where(
				and(
					eq(recurringTemplates.householdId, householdId),
					isNull(recurringTemplates.deletedAt),
					eq(recurringTemplates.type, "expense"),
					lte(recurringTemplates.startDate, monthEnd),
					or(
						isNull(recurringTemplates.endDate),
						gte(recurringTemplates.endDate, monthStart),
					),
				),
			)
			.groupBy(recurringTemplates.categoryId, categories.name),
	]);

	const totalIncome = incomeRows.reduce((sum, r) => sum + r.amountOere, 0);
	const totalExpenses = expenseRows.reduce((sum, r) => sum + r.amountOere, 0);
	const savingsRate =
		totalIncome > 0
			? ((totalIncome - totalExpenses) / totalIncome) * 100
			: null;

	const monthlyLoanTotal = loanRows.reduce((sum, r) => sum + r.amountOere, 0);
	const monthlyLoanInterest = loanRows.reduce((sum, r) => sum + (r.interestOere ?? 0), 0);
	const monthlyLoanPrincipal = loanRows.reduce((sum, r) => sum + (r.principalOere ?? 0), 0);

	const selectedMonthStr = format(selectedMonth, "yyyy-MM");

	// Build 6-month trend timeline
	const trendMonths = Array.from({ length: 6 }, (_, i) =>
		format(subMonths(selectedMonth, 5 - i), "yyyy-MM"),
	);
	const trendData = trendMonths.map((m) => ({
		month: m,
		expenses: monthlyExpenses.find((e) => e.month === m)?.total ?? 0,
		income: monthlyIncome.find((e) => e.month === m)?.total ?? 0,
	}));

	return (
		<DashboardClient
			selectedMonthStr={selectedMonthStr}
			totalIncome={totalIncome}
			totalExpenses={totalExpenses}
			savingsRate={savingsRate}
			categoryBreakdown={categoryBreakdown}
			upcomingRecurring={upcomingRecurring}
			trendData={trendData}
			budgetByCategory={budgetRows}
			hasData={expenseRows.length > 0 || incomeRows.length > 0}
			noAccountSelected={false}
			monthlyLoanTotal={monthlyLoanTotal}
			monthlyLoanInterest={monthlyLoanInterest}
			monthlyLoanPrincipal={monthlyLoanPrincipal}
			activeTab={activeTab}
		/>
	);
}
