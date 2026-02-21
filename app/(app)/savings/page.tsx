import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { PiggyBank, Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { categories, expenses, savingsGoals } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { formatNOK } from "@/lib/format";
import { getHouseholdId } from "@/lib/households";
import { SavingsAccountCard } from "./savings-account-card";
import { deleteSavingsAccount } from "./actions";

export default async function SavingsPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const accounts = householdId
		? await db
				.select()
				.from(savingsGoals)
				.where(
					and(
						eq(savingsGoals.householdId, householdId),
						isNull(savingsGoals.deletedAt),
					),
				)
				.orderBy(savingsGoals.name)
		: [];

	// Compute balance for each savings account from linked expenses
	const balances: Record<string, number> = {};
	if (accounts.length > 0 && householdId) {
		const rows = await db
			.select({
				savingsGoalId: expenses.savingsGoalId,
				total: sql<number>`coalesce(sum(${expenses.amountOere}), 0)::int`,
			})
			.from(expenses)
			.where(
				and(
					eq(expenses.householdId, householdId),
					isNull(expenses.deletedAt),
					sql`${expenses.savingsGoalId} is not null`,
				),
			)
			.groupBy(expenses.savingsGoalId);

		for (const row of rows) {
			if (row.savingsGoalId) {
				balances[row.savingsGoalId] = row.total;
			}
		}
	}

	// Get recent transactions for each savings account (last 5)
	const recentTransactions: Record<
		string,
		Array<{ date: string; notes: string | null; amountOere: number }>
	> = {};
	if (accounts.length > 0 && householdId) {
		const txRows = await db
			.select({
				savingsGoalId: expenses.savingsGoalId,
				date: expenses.date,
				notes: expenses.notes,
				amountOere: expenses.amountOere,
			})
			.from(expenses)
			.where(
				and(
					eq(expenses.householdId, householdId),
					isNull(expenses.deletedAt),
					sql`${expenses.savingsGoalId} is not null`,
				),
			)
			.orderBy(desc(expenses.date), desc(expenses.createdAt))
			.limit(accounts.length * 5);

		for (const tx of txRows) {
			if (!tx.savingsGoalId) continue;
			if (!recentTransactions[tx.savingsGoalId]) {
				recentTransactions[tx.savingsGoalId] = [];
			}
			if (recentTransactions[tx.savingsGoalId].length < 5) {
				recentTransactions[tx.savingsGoalId].push({
					date: tx.date,
					notes: tx.notes,
					amountOere: tx.amountOere,
				});
			}
		}
	}

	const totalBalance = Object.values(balances).reduce((s, b) => s + b, 0);
	const totalTarget = accounts.reduce((s, a) => s + (a.targetOere ?? 0), 0);

	return (
		<div className="p-8">
			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
						Sparing
					</h2>
					{accounts.length > 0 && (
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Total saldo:{" "}
							<span className="font-medium text-green-600 dark:text-green-400">
								{formatNOK(totalBalance)}
							</span>
							{totalTarget > 0 && (
								<>
									{" "}
									av{" "}
									<span className="font-medium text-gray-700 dark:text-gray-300">
										{formatNOK(totalTarget)}
									</span>
								</>
							)}
						</p>
					)}
				</div>
				<Link
					href="/savings/new"
					className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
				>
					<Plus className="h-4 w-4" />
					Ny sparekonto
				</Link>
			</div>

			{/* Account cards */}
			{accounts.length === 0 ? (
				<div className="rounded-xl border border-dashed border-gray-200 py-20 text-center dark:border-gray-700">
					<PiggyBank className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
					<p className="text-gray-400 dark:text-gray-500">
						Ingen sparekontoer ennå
					</p>
					<p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
						Opprett en sparekonto og registrer utgifter med kategorien
						&laquo;Sparing&raquo; for å spore saldoen automatisk.
					</p>
					<Link
						href="/savings/new"
						className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
					>
						<Plus className="h-4 w-4" />
						Ny sparekonto
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
					{accounts.map((account) => {
						const balance = balances[account.id] ?? 0;
						const transactions = recentTransactions[account.id] ?? [];
						const deleteAction = deleteSavingsAccount.bind(null, account.id);

						return (
							<SavingsAccountCard
								key={account.id}
								account={{
									id: account.id,
									name: account.name,
									targetOere: account.targetOere,
									targetDate: account.targetDate,
								}}
								balance={balance}
								recentTransactions={transactions}
								deleteAction={deleteAction}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
