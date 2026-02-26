import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { categories, importBatches, loans, users } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { getVisibleAccounts } from "@/lib/accounts";
import { rollbackImport } from "./actions";
import type { Category } from "./csv-import";
import { ImportTabs } from "./import-tabs";
import { RollbackButton } from "./rollback-button";

export default async function ImportPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const [cats, batches, visibleAccounts, loanRows] =
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
				: ([] as Category[]),
			householdId
				? db
						.select({
							id: importBatches.id,
							filename: importBatches.filename,
							rowCount: importBatches.rowCount,
							accountId: importBatches.accountId,
							createdAt: importBatches.createdAt,
							rolledBackAt: importBatches.rolledBackAt,
							uploaderName: users.name,
							uploaderEmail: users.email,
						})
						.from(importBatches)
						.leftJoin(users, eq(importBatches.userId, users.id))
						.where(eq(importBatches.householdId, householdId))
						.orderBy(desc(importBatches.createdAt))
						.limit(40)
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

	// Build account name map for history display
	const accountMap = Object.fromEntries(
		visibleAccounts.map((a) => [a.id, a.name]),
	);

	return (
		<div>
			<ImportTabs
				categories={cats}
				accounts={visibleAccounts}
				loans={loanRows}
			/>

			{batches.length > 0 && (
				<div className="max-w-4xl px-4 pb-12 sm:px-8">
					<h3 className="mb-4 text-sm font-medium text-foreground/60 dark:text-foreground/50">
						Importhistorikk
					</h3>
					<div className="overflow-x-auto rounded-lg border border-border dark:border-border/40">
						<table className="min-w-full text-sm">
							<thead className="bg-background dark:bg-card">
								<tr>
									<th className="px-4 py-2.5 text-left font-medium text-foreground/60 dark:text-foreground/50">
										Fil
									</th>
									<th className="px-4 py-2.5 text-left font-medium text-foreground/60 dark:text-foreground/50">
										Dato
									</th>
									<th className="px-4 py-2.5 text-left font-medium text-foreground/60 dark:text-foreground/50">
										Opplastet av
									</th>
									<th className="px-4 py-2.5 text-left font-medium text-foreground/60 dark:text-foreground/50">
										Konto
									</th>
									<th className="px-4 py-2.5 text-left font-medium text-foreground/60 dark:text-foreground/50">
										Rader
									</th>
									<th className="px-4 py-2.5 text-left font-medium text-foreground/60 dark:text-foreground/50">
										Status
									</th>
									<th className="px-4 py-2.5" />
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 bg-card dark:divide-gray-800 dark:bg-card">
								{batches.map((batch) => {
									const rollbackAction = rollbackImport.bind(null, batch.id);
									return (
										<tr key={batch.id}>
											<td className="max-w-[200px] truncate px-4 py-2.5 text-foreground/80 dark:text-foreground/80">
												<span title={batch.filename}>{batch.filename}</span>
											</td>
											<td className="whitespace-nowrap px-4 py-2.5 text-foreground/80 dark:text-foreground/80">
												{format(batch.createdAt, "d. MMM yyyy HH:mm", {
													locale: nb,
												})}
											</td>
											<td className="whitespace-nowrap px-4 py-2.5 text-foreground/70 dark:text-foreground/50">
												{batch.uploaderName ?? batch.uploaderEmail ?? "—"}
											</td>
											<td className="px-4 py-2.5 text-foreground/70 dark:text-foreground/50">
												{batch.accountId
													? (accountMap[batch.accountId] ?? "—")
													: "—"}
											</td>
											<td className="px-4 py-2.5 text-foreground/80 dark:text-foreground/80">
												{batch.rowCount}
											</td>
											<td className="px-4 py-2.5">
												{batch.rolledBackAt ? (
													<span className="inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-xs font-medium text-foreground/70 dark:bg-card dark:text-foreground/50">
														Angret
													</span>
												) : (
													<span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
														Aktiv
													</span>
												)}
											</td>
											<td className="px-4 py-2.5 text-right">
												{!batch.rolledBackAt && (
													<RollbackButton
														action={rollbackAction}
														filename={batch.filename}
													/>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
