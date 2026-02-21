import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, expenses, incomeEntries } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { ChartsClient } from "./charts-client";

export default async function ChartsPage({
	searchParams,
}: {
	searchParams: Promise<{ month?: string }>;
}) {
	const params = await searchParams;
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	// Parse selected month
	let selectedMonth: Date;
	if (params.month) {
		const [yearStr, monStr] = params.month.split("-");
		selectedMonth = new Date(
			Number.parseInt(yearStr, 10),
			Number.parseInt(monStr, 10) - 1,
			1,
		);
	} else {
		const now = new Date();
		selectedMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	}

	const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
	const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

	// 6-month window: from start of (selectedMonth - 5 months) through end of selectedMonth
	const sixMonthsAgoStart = format(
		startOfMonth(subMonths(selectedMonth, 5)),
		"yyyy-MM-dd",
	);

	const [categoryBreakdown, monthlyExpenses, monthlyIncome] = householdId
		? await Promise.all([
				// Category spending breakdown for the selected month
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
						),
					)
					.groupBy(expenses.categoryId, categories.name)
					.orderBy(sql`sum(${expenses.amountOere}) desc`),

				// Monthly expense totals over the last 6 months
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
						),
					)
					.groupBy(sql`to_char(${expenses.date}::date, 'YYYY-MM')`)
					.orderBy(sql`to_char(${expenses.date}::date, 'YYYY-MM')`),

				// Monthly income totals over the last 6 months
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
						),
					)
					.groupBy(sql`to_char(${incomeEntries.date}::date, 'YYYY-MM')`)
					.orderBy(sql`to_char(${incomeEntries.date}::date, 'YYYY-MM')`),
			])
		: [[], [], []];

	// Build a consistent 6-month timeline array
	const months = Array.from({ length: 6 }, (_, i) =>
		format(subMonths(selectedMonth, 5 - i), "yyyy-MM"),
	);

	const trendData = months.map((m) => ({
		month: m,
		expenses: monthlyExpenses.find((e) => e.month === m)?.total ?? 0,
		income: monthlyIncome.find((e) => e.month === m)?.total ?? 0,
	}));

	const selectedMonthStr = format(selectedMonth, "yyyy-MM");

	return (
		<ChartsClient
			selectedMonthStr={selectedMonthStr}
			categoryBreakdown={categoryBreakdown}
			trendData={trendData}
		/>
	);
}
