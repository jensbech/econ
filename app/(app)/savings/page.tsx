import { and, desc, eq, gte, isNull, or, sql } from "drizzle-orm";
import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { db } from "@/db";
import { accounts, expenses, incomeEntries } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { formatNOK } from "@/lib/format";
import { getHouseholdId } from "@/lib/households";
import { SavingsAccountCard } from "./savings-account-card";

const COIN_GECKO_IDS: Record<string, string> = {
	BTC: "bitcoin",
	ETH: "ethereum",
	SOL: "solana",
	ADA: "cardano",
	XRP: "ripple",
	DOT: "polkadot",
	LINK: "chainlink",
	MATIC: "matic-network",
};

async function fetchCoinPricesNOK(symbols: string[]): Promise<Record<string, number>> {
	const geckoIds = [...new Set(symbols.map((s) => COIN_GECKO_IDS[s]).filter(Boolean))];
	if (geckoIds.length === 0) return {};
	try {
		const res = await fetch(
			`https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(",")}&vs_currencies=nok`,
			{ next: { revalidate: 300 } },
		);
		if (!res.ok) return {};
		const data = await res.json();
		const result: Record<string, number> = {};
		for (const [symbol, geckoId] of Object.entries(COIN_GECKO_IDS)) {
			if (data[geckoId]?.nok) result[symbol] = data[geckoId].nok;
		}
		return result;
	} catch {
		return {};
	}
}

export default async function SavingsPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	// Get savings and crypto accounts visible to this user (public + own private)
	const savingsAccounts = householdId
		? await db
				.select()
				.from(accounts)
				.where(
					and(
						eq(accounts.householdId, householdId),
						or(eq(accounts.kind, "savings"), eq(accounts.kind, "crypto")),
						isNull(accounts.deletedAt),
						or(
							eq(accounts.type, "public"),
							eq(accounts.userId, user.id),
						),
					),
				)
				.orderBy(accounts.name)
		: [];

	// Fetch live prices for crypto accounts
	const cryptoSymbols = savingsAccounts
		.filter((a) => a.kind === "crypto" && a.coinSymbol)
		.map((a) => a.coinSymbol as string);

	const coinPrices = cryptoSymbols.length > 0 ? await fetchCoinPricesNOK(cryptoSymbols) : {};
	const cryptoPriceAvailable: Record<string, boolean> = {};

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
		// Separate crypto from regular savings
		const regularAccounts = savingsAccounts.filter((a) => a.kind !== "crypto");
		const cryptoAccounts = savingsAccounts.filter((a) => a.kind === "crypto");

		// Compute crypto balances from live prices
		for (const account of cryptoAccounts) {
			const price = account.coinSymbol ? (coinPrices[account.coinSymbol] ?? null) : null;
			cryptoPriceAvailable[account.id] = price != null;
			balances[account.id] =
				price != null && account.coinQuantity != null
					? Math.round(account.coinQuantity * price * 100)
					: 0;
			recentTransactions[account.id] = [];
		}

		if (regularAccounts.length > 0) {
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
			const accountsWithOpening = regularAccounts.filter(
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

			// Calculate balance for each regular savings account
			for (const account of regularAccounts) {
				if (account.openingBalanceOere != null && account.openingBalanceDate != null) {
					balances[account.id] = account.openingBalanceOere + (filteredIncome[account.id] ?? 0) - (filteredExpenses[account.id] ?? 0);
				} else {
					const income = incomeByAccount[account.id] ?? 0;
					const expensesAmount = expensesByAccount[account.id] ?? 0;
					balances[account.id] = income - expensesAmount;
				}
			}

			// Get recent transactions (income + expenses) for regular accounts, limit 5 per account
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
				.limit(regularAccounts.length * 5);

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
				.limit(regularAccounts.length * 5);

			// Combine and organize transactions by account
			for (const account of regularAccounts) {
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
	}

	const totalBalance = Object.values(balances).reduce((s, b) => s + b, 0);

	return (
		<div className="p-4 sm:p-6 lg:p-8">
			{/* Header */}
			<div className="mb-6">
				<div>
					<h2 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
						Sparing
					</h2>
					{savingsAccounts.length > 0 && (
						<p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
							Total saldo:{" "}
							<span className="font-medium text-primary">
								{formatNOK(totalBalance)}
							</span>
						</p>
					)}
				</div>
			</div>

			{/* Account cards */}
			{savingsAccounts.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border py-20 text-center dark:border-border/40">
					<PiggyBank className="mx-auto mb-3 h-8 w-8 text-gray-300 dark:text-foreground/70" />
					<p className="text-foreground/50 dark:text-foreground/60">
						Ingen sparekontoer ennå
					</p>
					<p className="mt-1 text-sm text-foreground/50 dark:text-foreground/60">
						Opprett en konto av type &laquo;Sparekonto&raquo; eller &laquo;Krypto&raquo; på Kontoer-siden.
					</p>
					<Link
						href="/accounts"
						className="mt-4 inline-flex items-center gap-2 rounded-lg bg-card px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
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
								coinSymbol={account.coinSymbol ?? undefined}
								coinQuantity={account.coinQuantity ?? undefined}
								livePriceAvailable={
									account.kind === "crypto"
										? (cryptoPriceAvailable[account.id] ?? false)
										: undefined
								}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
