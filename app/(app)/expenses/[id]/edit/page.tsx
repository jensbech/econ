import { parse } from "date-fns";
import { and, eq, isNull } from "drizzle-orm";
import { ArrowLeft, Repeat } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { categories, expenses, loans } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { getVisibleAccounts } from "@/lib/accounts";
import { deleteExpense, updateExpense } from "../../actions";
import { ExpenseForm } from "../../expense-form";
import { DeleteExpenseButton } from "./delete-button";

export default async function EditExpensePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) notFound();

	const [expense] = await db
		.select()
		.from(expenses)
		.where(
			and(
				eq(expenses.id, id),
				eq(expenses.householdId, householdId),
				isNull(expenses.deletedAt),
			),
		)
		.limit(1);

	if (!expense) notFound();

	const [expenseCategories, visibleAccounts, loanRows] =
		await Promise.all([
			db
				.select({ id: categories.id, name: categories.name })
				.from(categories)
				.where(
					and(
						eq(categories.householdId, householdId),
						eq(categories.type, "expense"),
						isNull(categories.deletedAt),
					),
				)
				.orderBy(categories.name),
			getVisibleAccounts(user.id as string, householdId),
			
			db
				.select({ id: loans.id, name: loans.name })
				.from(loans)
				.where(
					and(
						eq(loans.householdId, householdId),
						isNull(loans.deletedAt),
					),
				)
				.orderBy(loans.name),
		]);

	const updateAction = updateExpense.bind(null, expense.id);
	const deleteAction = deleteExpense.bind(null, expense.id);

	const defaultAmountNOK = (expense.amountOere / 100).toFixed(2);
	const defaultDate = expense.date
		? parse(expense.date, "yyyy-MM-dd", new Date())
		: undefined;

	const defaultInterestNOK = expense.interestOere
		? (expense.interestOere / 100).toFixed(2)
		: undefined;
	const defaultPrincipalNOK = expense.principalOere
		? (expense.principalOere / 100).toFixed(2)
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
					Rediger utgift
				</h1>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Oppdater detaljer for utgiften.
				</p>
			</div>

			{expense.recurringTemplateId && (
				<div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/30 dark:bg-amber-900/10">
					<Repeat className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
					<div>
						<p className="font-medium text-amber-800 dark:text-amber-300">
							Gjentagende utgift
						</p>
						<p className="mt-0.5 text-amber-700 dark:text-amber-400">
							Lagring vil kun endre denne forekomsten og koble den fra malen.{" "}
							<Link
								href={`/expenses/recurring/${expense.recurringTemplateId}/edit`}
								className="underline hover:no-underline"
							>
								Rediger malen i stedet
							</Link>
						</p>
					</div>
				</div>
			)}

			<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<ExpenseForm
					action={updateAction}
					defaultDate={defaultDate}
					defaultAmountNOK={defaultAmountNOK}
					defaultCategoryId={expense.categoryId ?? undefined}
					defaultNotes={expense.notes ?? undefined}
					defaultAccountId={expense.accountId ?? undefined}
					defaultLoanId={expense.loanId ?? undefined}
					defaultInterestNOK={defaultInterestNOK}
					defaultPrincipalNOK={defaultPrincipalNOK}
					categories={expenseCategories}
					accounts={visibleAccounts}
					loans={loanRows}
					submitLabel="Lagre endringer"
				/>
			</div>

			<div className="rounded-xl border border-red-100 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-900/10">
				<h2 className="mb-2 text-sm font-semibold text-red-800 dark:text-red-300">
					Faresone
				</h2>
				<p className="mb-4 text-sm text-red-600 dark:text-red-400">
					Sletting av utgiften kan ikke angres.
				</p>
				<DeleteExpenseButton deleteAction={deleteAction} />
			</div>
		</div>
	);
}
