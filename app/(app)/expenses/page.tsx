import { endOfMonth, format, startOfMonth } from "date-fns";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { Plus, Repeat } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { categories, expenses } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { expandRecurringExpenses } from "@/lib/expand-recurring";
import { getHouseholdId } from "@/lib/households";
import { ExpenseTable } from "./expense-table";

export default async function ExpensesPage({
	searchParams,
}: {
	searchParams: Promise<{
		month?: string;
		categoryId?: string;
		from?: string;
		to?: string;
	}>;
}) {
	const params = await searchParams;
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const { month, categoryId, from, to } = params;

	// Expand recurring expenses for the viewed month (idempotent)
	if (householdId) {
		let expandMonth: Date;
		if (month && month !== "all") {
			const [yearStr, monStr] = month.split("-");
			expandMonth = new Date(
				Number.parseInt(yearStr, 10),
				Number.parseInt(monStr, 10) - 1,
				1,
			);
		} else if (!month) {
			expandMonth = new Date();
		} else {
			expandMonth = new Date();
		}
		await expandRecurringExpenses(householdId, expandMonth);
	}

	type WhereCondition = Parameters<typeof and>[0];
	const conditions: WhereCondition[] = [];

	if (householdId) {
		conditions.push(eq(expenses.householdId, householdId));
	}
	conditions.push(isNull(expenses.deletedAt));

	if (month === "all") {
		// No month constraint — optionally filter by date range
		if (from) conditions.push(gte(expenses.date, from));
		if (to) conditions.push(lte(expenses.date, to));
	} else if (month) {
		const [yearStr, monStr] = month.split("-");
		const year = Number.parseInt(yearStr, 10);
		const mon = Number.parseInt(monStr, 10);
		const start = format(new Date(year, mon - 1, 1), "yyyy-MM-dd");
		const end = format(new Date(year, mon, 0), "yyyy-MM-dd");
		conditions.push(gte(expenses.date, start));
		conditions.push(lte(expenses.date, end));
	} else {
		// Default: current month
		const now = new Date();
		conditions.push(
			gte(expenses.date, format(startOfMonth(now), "yyyy-MM-dd")),
		);
		conditions.push(lte(expenses.date, format(endOfMonth(now), "yyyy-MM-dd")));
	}

	if (categoryId) {
		conditions.push(eq(expenses.categoryId, categoryId));
	}

	const [expenseRows, categoryRows] = householdId
		? await Promise.all([
				db
					.select({
						id: expenses.id,
						date: expenses.date,
						notes: expenses.notes,
						amountOere: expenses.amountOere,
						categoryId: expenses.categoryId,
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
					.where(and(...conditions))
					.orderBy(desc(expenses.date), desc(expenses.createdAt)),
				db
					.select({ id: categories.id, name: categories.name })
					.from(categories)
					.where(
						and(
							eq(categories.householdId, householdId),
							isNull(categories.deletedAt),
						),
					)
					.orderBy(categories.name),
			])
		: [[], []];

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
						Utgifter
					</h1>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						Oversikt over utgifter.
					</p>
				</div>
				<div className="flex gap-2">
					<Button asChild variant="outline" className="gap-2">
						<Link href="/expenses/recurring">
							<Repeat className="h-4 w-4" />
							Gjentagende
						</Link>
					</Button>
					<Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-700">
						<Link href="/expenses/new">
							<Plus className="h-4 w-4" />
							Ny utgift
						</Link>
					</Button>
				</div>
			</div>

			<Suspense
				fallback={
					<div className="flex h-64 items-center justify-center text-sm text-gray-400">
						Laster utgifter…
					</div>
				}
			>
				<ExpenseTable expenses={expenseRows} categories={categoryRows} />
			</Suspense>
		</div>
	);
}
