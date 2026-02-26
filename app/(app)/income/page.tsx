import { format } from "date-fns";
import { and, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { categories, incomeEntries } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { expandRecurringIncome } from "@/lib/expand-recurring";
import { getHouseholdId } from "@/lib/households";
import { getFilteredAccountIds } from "@/lib/accounts";
import { IncomeTable } from "./income-table";

export default async function IncomePage({
	searchParams,
}: {
	searchParams: Promise<{
		view?: string;
		month?: string;
		year?: string;
		categoryId?: string;
	}>;
}) {
	const params = await searchParams;
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	// Resolve selected account IDs from cookie
	const cookieStore = await cookies();
	const selectedRaw = cookieStore.get("selectedAccounts")?.value ?? "";
	const selectedIds = selectedRaw.split(",").filter(Boolean);

	const view = params.view === "yearly" ? "yearly" : "monthly";
	const { month: monthParam, year, categoryId } = params;
	// month searchParam overrides cookie; cookie overrides current month
	const monthCookie = cookieStore.get("selectedMonth")?.value;
	const month = monthParam ?? monthCookie;

	// Expand recurring income for the viewed month (idempotent)
	if (householdId) {
		let expandMonth: Date;
		if (view === "monthly") {
			if (month) {
				const [yearStr, monStr] = month.split("-");
				expandMonth = new Date(
					Number.parseInt(yearStr, 10),
					Number.parseInt(monStr, 10) - 1,
					1,
				);
			} else {
				expandMonth = new Date();
			}
		} else {
			expandMonth = new Date();
		}
		await expandRecurringIncome(householdId, expandMonth);
	}

	// No household — show empty state
	if (!householdId) {
		return (
			<div className="p-4 sm:p-8">
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
							Inntekt
						</h1>
					</div>
				</div>
				<div className="rounded-xl border border-dashed border-border bg-card py-16 text-center dark:border-border/40 dark:bg-card">
					<p className="text-base font-medium text-foreground/60 dark:text-foreground/50">
						Ingen husholdning funnet.
					</p>
				</div>
			</div>
		);
	}

	// Empty selection = all public accounts; explicit selection = those accounts only
	const validIds = await getFilteredAccountIds(user.id as string, householdId, selectedIds);

	type WhereCondition = Parameters<typeof and>[0];
	const conditions: WhereCondition[] = [];

	conditions.push(eq(incomeEntries.householdId, householdId));
	conditions.push(isNull(incomeEntries.deletedAt));

	if (validIds.length > 0) {
		// Show income with no account, OR with an account in the selected set
		conditions.push(or(isNull(incomeEntries.accountId), inArray(incomeEntries.accountId, validIds)));
	}

	if (view === "yearly") {
		const y = year ? Number.parseInt(year, 10) : new Date().getFullYear();
		const start = format(new Date(y, 0, 1), "yyyy-MM-dd");
		const end = format(new Date(y, 11, 31), "yyyy-MM-dd");
		conditions.push(gte(incomeEntries.date, start));
		conditions.push(lte(incomeEntries.date, end));
	} else if (month) {
		const [yearStr, monStr] = month.split("-");
		const yr = Number.parseInt(yearStr, 10);
		const mn = Number.parseInt(monStr, 10);
		const start = format(new Date(yr, mn - 1, 1), "yyyy-MM-dd");
		const end = format(new Date(yr, mn, 0), "yyyy-MM-dd");
		conditions.push(gte(incomeEntries.date, start));
		conditions.push(lte(incomeEntries.date, end));
	} else {
		const now = new Date();
		const start = format(
			new Date(now.getFullYear(), now.getMonth(), 1),
			"yyyy-MM-dd",
		);
		const end = format(
			new Date(now.getFullYear(), now.getMonth() + 1, 0),
			"yyyy-MM-dd",
		);
		conditions.push(gte(incomeEntries.date, start));
		conditions.push(lte(incomeEntries.date, end));
	}

	if (categoryId) {
		conditions.push(eq(incomeEntries.categoryId, categoryId));
	}

	const [incomeRows, categoryRows] = await Promise.all([
		db
			.select({
				id: incomeEntries.id,
				date: incomeEntries.date,
				source: incomeEntries.source,
				type: incomeEntries.type,
				amountOere: incomeEntries.amountOere,
				categoryId: incomeEntries.categoryId,
				categoryName: categories.name,
				recurringTemplateId: incomeEntries.recurringTemplateId,
			})
			.from(incomeEntries)
			.leftJoin(
				categories,
				and(
					eq(incomeEntries.categoryId, categories.id),
					eq(categories.householdId, householdId),
				),
			)
			.where(and(...conditions))
			.orderBy(desc(incomeEntries.date), desc(incomeEntries.createdAt)),
		db
			.select({ id: categories.id, name: categories.name })
			.from(categories)
			.where(
				and(
					eq(categories.householdId, householdId),
					eq(categories.type, "income"),
					isNull(categories.deletedAt),
				),
			)
			.orderBy(categories.name),
	]);

	return (
		<div className="p-4 sm:p-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
						Inntekt
					</h1>
					<p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
						Oversikt over inntekter.
					</p>
				</div>
				<Button asChild className="gap-2 bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8">
					<Link href="/income/new">
						<Plus className="h-4 w-4" />
						Ny inntekt
					</Link>
				</Button>
			</div>

			<Suspense
				fallback={
					<div className="flex h-64 items-center justify-center text-sm text-foreground/50">
						Laster inntekter…
					</div>
				}
			>
				<IncomeTable incomes={incomeRows} categories={categoryRows} />
			</Suspense>
		</div>
	);
}
