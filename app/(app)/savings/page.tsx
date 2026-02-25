import { and, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { db } from "@/db";
import { accounts, expenses, incomeEntries } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { formatNOK } from "@/lib/format";
import { getHouseholdId } from "@/lib/households";
import { SavingsAccountCard } from "./savings-account-card";

export default async function SavingsPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	// Get savings accounts visible to this user (public + own private)
	const savingsAccounts = householdId
		? await db
				.select()
				.from(accounts)
				.where(
					and(
						eq(accounts.householdId, householdId),
						eq(accounts.kind, "savings"),
						isNull(accounts.deletedAt),
						or(
							eq(accounts.type, "public"),
							eq(accounts.userId, user.id),
						),
					),
				)
				.orderBy(accounts.name)
		: [];

	// Compute balance for each savings account = sum(income) - sum(expenses)
	const balances: Record<string, number> = {};
	const recentTransactions: Record<
		string,
		Array<{
			date: string;
			notes: string | null;
			amount: number;
			type: "income" | "expense";
		}>
	> = {};

	if (savingsAccounts.length > 0 && householdId) {
		// Get income totals per account
		const incomeRows = await db
			.select({
				accountId: incomeEntries.accountId,
				total: sql<number>`coalesce(sum(${incomeEntries.amountOere}), 0)::int`,
			})
			.from(incomeEntries)
			.where(
				and(
					eq(incomeEntries.householdId, householdId),
					isNull(incomeEntries.deletedAt),
				),
			)
			.groupBy(incomeEntries.accountId);

		const incomeByAccount: Record<string, number> = {};
		for (const row of incomeRows) {
			if (row.accountId) {
				incomeByAccount[row.accountId] = row.total;
			}
		}

		// Get expense totals per account
		const expenseRows = await db
			.select({
				accountId: expenses.accountId,
				total: sql<number>`coalesce(sum(${expenses.amountOere}), 0)::int`,
			})
			.from(expenses)
			.where(
				and(
					eq(expenses.householdId, householdId),
					isNull(expenses.deletedAt),
				),
			)
			.groupBy(expenses.accountId);

		const expensesByAccount: Record<string, number> = {};
		for (const row of expenseRows) {
			if (row.accountId) {
				expensesByAccount[row.accountId] = row.total;
			}
		}

		// For accounts with opening balance, run filtered queries
		const accountsWithOpening = savingsAccounts.filter(
			(a) => a.openingBalanceOere != null && a.openingBalanceDate != null,
		);
		const filteredIncome: Record<string, number> = {};
		const filteredExpenses: Record<string, number> = {};
		for (const account of accountsWithOpening) {
			const fromDate = account.openingBalanceDate as string;
			const [incRow] = await db
				.select({ total: sql<number>`coalesce(sum(${incomeEntries.amountOere}), 0)::int` })
				.from(incomeEntries)
				.where(
					and(
						eq(incomeEntries.householdId, householdId),
						isNull(incomeEntries.deletedAt),
						eq(incomeEntries.accountId, account.id),
						gte(incomeEntries.date, fromDate),
					),
				);
			const [expRow] = await db
				.select({ total: sql<number>`coalesce(sum(${expenses.amountOere}), 0)::int` })
				.from(expenses)
				.where(
					and(
						eq(expenses.householdId, householdId),
						isNull(expenses.deletedAt),
						eq(expenses.accountId, account.id),
						gte(expenses.date, fromDate),
					),
				);
			filteredIncome[account.id] = incRow?.total ?? 0;
			filteredExpenses[account.id] = expRow?.total ?? 0;
		}

		// Calculate balance for each savings account
		for (const account of savingsAccounts) {
			if (account.openingBalanceOere != null && account.openingBalanceDate != null) {
				balances[account.id] = account.openingBalanceOere + (filteredIncome[account.id] ?? 0) - (filteredExpenses[account.id] ?? 0);
			} else {
				const income = incomeByAccount[account.id] ?? 0;
				const expensesAmount = expensesByAccount[account.id] ?? 0;
				balances[account.id] = income - expensesAmount;
			}
		}

		// Get recent transactions (income + expenses) for each account, limit 5 per account
		const recentIncome = await db
			.select({
				accountId: incomeEntries.accountId,
				date: incomeEntries.date,
				notes: incomeEntries.source,
				amountOere: incomeEntries.amountOere,
			})
			.from(incomeEntries)
			.where(
				and(
					eq(incomeEntries.householdId, householdId),
					isNull(incomeEntries.deletedAt),
				),
			)
			.orderBy(desc(incomeEntries.date), desc(incomeEntries.createdAt))
			.limit(savingsAccounts.length * 5);

		const recentExpenses = await db
			.select({
				accountId: expenses.accountId,
				date: expenses.date,
				notes: expenses.notes,
				amountOere: expenses.amountOere,
			})
			.from(expenses)
			.where(
				and(
					eq(expenses.householdId, householdId),
					isNull(expenses.deletedAt),
				),
			)
			.orderBy(desc(expenses.date), desc(expenses.createdAt))
			.limit(savingsAccounts.length * 5);

		// Combine and organize transactions by account
		for (const account of savingsAccounts) {
			recentTransactions[account.id] = [];
		}

		for (const tx of recentIncome) {
			if (tx.accountId && recentTransactions[tx.accountId]) {
				recentTransactions[tx.accountId].push({
					date: tx.date,
					notes: tx.notes,
					amount: tx.amountOere,
					type: "income",
				});
			}
		}

		for (const tx of recentExpenses) {
			if (tx.accountId && recentTransactions[tx.accountId]) {
				recentTransactions[tx.accountId].push({
					date: tx.date,
					notes: tx.notes,
					amount: tx.amountOere,
					type: "expense",
				});
			}
		}

		// Sort transactions by date and keep only 5 per account
		for (const accountId in recentTransactions) {
			recentTransactions[accountId]
				.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
				.splice(5);
		}
	}

	const totalBalance = Object.values(balances).reduce((s, b) => s + b, 0);

	return (
		<div className="p-8">
			{/* Header */}
			<div className="mb-6">
				<div>
					<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
						Sparing
					</h2>
					{savingsAccounts.length > 0 && (
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Total saldo:{" "}
							<span className="font-medium text-green-600 dark:text-green-400">
								{formatNOK(totalBalance)}
							</span>
						</p>
					)}
				</div>
			</div>

			{/* Account cards */}
			{savingsAccounts.length === 0 ? (
				<div className="rounded-xl border border-dashed border-gray-200 py-20 text-center dark:border-gray-700">
					<PiggyBank className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" />
					<p className="text-gray-400 dark:text-gray-500">
						Ingen sparekontoer ennå
					</p>
					<p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
						Opprett en konto av type &laquo;Sparekonto&raquo; på Kontoer-siden.
					</p>
					<Link
						href="/accounts"
						className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
					>
						Gå til Kontoer
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
					{savingsAccounts.map((account) => {
						const balance = balances[account.id] ?? 0;
						const transactions = recentTransactions[account.id] ?? [];

						return (
							<SavingsAccountCard
								key={account.id}
								account={{
									id: account.id,
									name: account.name,
								}}
								balance={balance}
								recentTransactions={transactions}
								openingBalanceDate={account.openingBalanceDate ?? undefined}
								hasOpeningBalance={account.openingBalanceOere != null}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
