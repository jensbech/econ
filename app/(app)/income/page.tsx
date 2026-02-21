import { format } from "date-fns";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { categories, incomeEntries } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { expandRecurringIncome } from "@/lib/expand-recurring";
import { getHouseholdId } from "@/lib/households";
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

	const view = params.view === "yearly" ? "yearly" : "monthly";
	const { month, year, categoryId } = params;

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

	type WhereCondition = Parameters<typeof and>[0];
	const conditions: WhereCondition[] = [];

	if (householdId) {
		conditions.push(eq(incomeEntries.householdId, householdId));
	}
	conditions.push(isNull(incomeEntries.deletedAt));

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
		// Default: current month
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

	const [incomeRows, categoryRows] = householdId
		? await Promise.all([
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
			])
		: [[], []];

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
						Inntekt
					</h1>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						Oversikt over inntekter.
					</p>
				</div>
				<Button asChild className="gap-2 bg-indigo-600 hover:bg-indigo-700">
					<Link href="/income/new">
						<Plus className="h-4 w-4" />
						Ny inntekt
					</Link>
				</Button>
			</div>

			<Suspense
				fallback={
					<div className="flex h-64 items-center justify-center text-sm text-gray-400">
						Laster inntekter…
					</div>
				}
			>
				<IncomeTable incomes={incomeRows} categories={categoryRows} />
			</Suspense>
		</div>
	);
}
