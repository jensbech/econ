import { endOfMonth, format, startOfMonth } from "date-fns";
import { and, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { Plus, Repeat } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { categories, expenses, loans, users } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { expandRecurringExpenses } from "@/lib/expand-recurring";
import { getHouseholdId } from "@/lib/households";
import { getFilteredAccountIds, getVisibleAccounts } from "@/lib/accounts";
import { ExpenseTable } from "./expense-table";

export default async function ExpensesPage({
	searchParams,
}: {
	searchParams: Promise<{
		month?: string;
		categoryId?: string;
		from?: string;
		to?: string;
		importBatch?: string;
	}>;
}) {
	const params = await searchParams;
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	// Resolve selected account IDs from cookie
	const cookieStore = await cookies();
	const selectedRaw = cookieStore.get("selectedAccounts")?.value ?? "";
	const selectedIds = selectedRaw.split(",").filter(Boolean);

	// month searchParam overrides cookie; cookie overrides current month
	const MONTH_RE = /^\d{4}-(?:0[1-9]|1[0-2])$/;
	const monthCookie = cookieStore.get("selectedMonth")?.value;
	const { month: monthParam, categoryId, from, to, importBatch } = params;
	const rawMonth = monthParam ?? (monthCookie && monthCookie !== "all" ? monthCookie : undefined);
	const month = rawMonth && MONTH_RE.test(rawMonth) ? rawMonth : rawMonth === "all" ? "all" : undefined;

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
		} else {
			expandMonth = new Date();
		}
		await expandRecurringExpenses(householdId, expandMonth);
	}

	// No household — show empty state
	if (!householdId) {
		return (
			<div className="p-4 sm:p-8">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
							Utgifter
						</h1>
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Oversikt over utgifter.
						</p>
					</div>
				</div>
				<div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-800">
					<p className="text-base font-medium text-gray-500 dark:text-gray-400">
						Ingen husholdning funnet.
					</p>
				</div>
			</div>
		);
	}

	// Empty selection = all public accounts; explicit selection = those accounts only
	const [validIds, visibleAccounts] = await Promise.all([
		getFilteredAccountIds(user.id as string, householdId, selectedIds),
		getVisibleAccounts(user.id as string, householdId),
	]);

	type WhereCondition = Parameters<typeof and>[0];
	const conditions: WhereCondition[] = [];

	conditions.push(eq(expenses.householdId, householdId));
	conditions.push(isNull(expenses.deletedAt));

	if (validIds.length > 0) {
		// Show expenses with no account, OR with an account in the selected set
		conditions.push(or(isNull(expenses.accountId), inArray(expenses.accountId, validIds)));
	}

	if (importBatch) {
		// Filter to only rows from this import batch; skip month filter
		conditions.push(eq(expenses.importBatchId, importBatch));
	} else if (month === "all") {
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
		const now = new Date();
		conditions.push(
			gte(expenses.date, format(startOfMonth(now), "yyyy-MM-dd")),
		);
		conditions.push(lte(expenses.date, format(endOfMonth(now), "yyyy-MM-dd")));
	}

	if (categoryId) {
		conditions.push(eq(expenses.categoryId, categoryId));
	}

	const [expenseRows, categoryRows] = await Promise.all([
		db
			.select({
				id: expenses.id,
				date: expenses.date,
				notes: expenses.notes,
				amountOere: expenses.amountOere,
				categoryId: expenses.categoryId,
				categoryName: categories.name,
				accountId: expenses.accountId,
				uploaderName: users.name,
				loanId: expenses.loanId,
				interestOere: expenses.interestOere,
				principalOere: expenses.principalOere,
				loanName: loans.name,
			})
			.from(expenses)
			.leftJoin(
				categories,
				and(
					eq(expenses.categoryId, categories.id),
					eq(categories.householdId, householdId),
				),
			)
			.leftJoin(users, eq(expenses.userId, users.id))
			.leftJoin(loans, eq(expenses.loanId, loans.id))
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
	]);

	// Map accountId to account name for display
	const accountMap = Object.fromEntries(visibleAccounts.map((a) => [a.id, a.name]));
	const expenseRowsWithAccount = expenseRows.map((r) => ({
		...r,
		accountName: r.accountId ? (accountMap[r.accountId] ?? null) : null,
		scope: "household" as const,
	}));

	return (
		<div className="p-4 sm:p-8">
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
					<Button asChild className="gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
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
				<ExpenseTable expenses={expenseRowsWithAccount} categories={categoryRows} importBatchId={importBatch} />
			</Suspense>
		</div>
	);
}
