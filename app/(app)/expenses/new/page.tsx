import { and, eq, isNull } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/db";
import { categories, loans } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { getVisibleAccounts } from "@/lib/accounts";
import { createExpense } from "../actions";
import { ExpenseForm } from "../expense-form";

export default async function NewExpensePage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const cookieStore = await cookies();
	const selectedRaw = cookieStore.get("selectedAccounts")?.value ?? "";
	const selectedIds = selectedRaw.split(",").filter(Boolean);

	const [expenseCategories, visibleAccounts, loanRows] =
		await Promise.all([
			householdId
				? db
						.select({ id: categories.id, name: categories.name })
						.from(categories)
						.where(
							and(
								eq(categories.householdId, householdId),
								eq(categories.type, "expense"),
								isNull(categories.deletedAt),
							),
						)
						.orderBy(categories.name)
				: [],
			householdId
				? getVisibleAccounts(user.id as string, householdId)
				: [],
			householdId
				? db
						.select({ id: loans.id, name: loans.name })
						.from(loans)
						.where(
							and(
								eq(loans.householdId, householdId),
								isNull(loans.deletedAt),
							),
						)
						.orderBy(loans.name)
				: [],
		]);

	const defaultAccountId =
		selectedIds.length === 1 &&
		visibleAccounts.some((a) => a.id === selectedIds[0])
			? selectedIds[0]
			: undefined;

	return (
		<div className="mx-auto max-w-lg space-y-6 p-4 sm:p-8">
			<div>
				<Link
					href="/expenses"
					className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Tilbake til utgifter
				</Link>
				<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
					Ny utgift
				</h1>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Registrer en ny utgift for husholdningen.
				</p>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<ExpenseForm
					action={createExpense}
					categories={expenseCategories}
					accounts={visibleAccounts}
					loans={loanRows}
					defaultAccountId={defaultAccountId}
					submitLabel="Legg til utgift"
				/>
			</div>
		</div>
	);
}
