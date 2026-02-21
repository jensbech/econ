import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
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
					icon: accounts.icon,
					userId: accounts.userId,
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

	return (
		<div className="p-4 sm:p-8">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
					Kontoer
				</h1>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Administrer kontoer for husholdningen.
				</p>
			</div>
			<AccountsClient
				accounts={rows}
				currentUserId={user.id as string}
			/>
		</div>
	);
}
