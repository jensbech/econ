import { and, eq, gte, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, expenses, incomeEntries, users } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { AccountsClient } from "./accounts-client";

export default async function AccountsPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const rows = householdId
		? await db
				.select({
					id: accounts.id,
					name: accounts.name,
					accountNumber: accounts.accountNumber,
					type: accounts.type,
					kind: accounts.kind,
					icon: accounts.icon,
					userId: accounts.userId,
					openingBalanceOere: accounts.openingBalanceOere,
					openingBalanceDate: accounts.openingBalanceDate,
					coinSymbol: accounts.coinSymbol,
					coinQuantity: accounts.coinQuantity,
					creatorName: users.name,
					creatorEmail: users.email,
				})
				.from(accounts)
				.leftJoin(users, eq(accounts.userId, users.id))
				.where(
					and(
						eq(accounts.householdId, householdId),
						isNull(accounts.deletedAt),
						or(
							eq(accounts.type, "public"),
							eq(accounts.userId, user.id as string),
						),
					),
				)
				.orderBy(accounts.createdAt)
		: [];

	const balanceMap: Record<string, number | null> = {};

	if (rows.length > 0 && householdId) {
		for (const account of rows) {
			const fromDate = account.openingBalanceDate ?? null;

			const whereIncome = fromDate
				? and(
						eq(incomeEntries.householdId, householdId),
						isNull(incomeEntries.deletedAt),
						eq(incomeEntries.accountId, account.id),
						gte(incomeEntries.date, fromDate),
					)
				: and(
						eq(incomeEntries.householdId, householdId),
						isNull(incomeEntries.deletedAt),
						eq(incomeEntries.accountId, account.id),
					);

			const whereExpenses = fromDate
				? and(
						eq(expenses.householdId, householdId),
						isNull(expenses.deletedAt),
						eq(expenses.accountId, account.id),
						gte(expenses.date, fromDate),
					)
				: and(
						eq(expenses.householdId, householdId),
						isNull(expenses.deletedAt),
						eq(expenses.accountId, account.id),
					);

			const [incRow] = await db
				.select({ total: sql<number>`coalesce(sum(${incomeEntries.amountOere}), 0)::int` })
				.from(incomeEntries)
				.where(whereIncome);

			const [expRow] = await db
				.select({ total: sql<number>`coalesce(sum(${expenses.amountOere}), 0)::int` })
				.from(expenses)
				.where(whereExpenses);

			const inc = incRow?.total ?? 0;
			const exp = expRow?.total ?? 0;
			const hasActivity = account.openingBalanceOere != null || inc > 0 || exp > 0;

			balanceMap[account.id] = hasActivity
				? (account.openingBalanceOere ?? 0) + inc - exp
				: null;
		}
	}

	return (
		<div className="p-4 sm:p-8">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
					Kontoer
				</h1>
				<p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
					Administrer kontoer for husholdningen.
				</p>
			</div>
			<AccountsClient
				accounts={rows}
				currentUserId={user.id as string}
				balances={balanceMap}
			/>
		</div>
	);
}
