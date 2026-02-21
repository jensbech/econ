import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { categories, importBatches } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { rollbackImport } from "./actions";
import type { Category } from "./csv-import";
import { ImportTabs } from "./import-tabs";

export default async function ImportPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const [cats, batches] = await Promise.all([
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
					.select()
					.from(importBatches)
					.where(eq(importBatches.householdId, householdId))
					.orderBy(desc(importBatches.createdAt))
					.limit(20)
			: [],
	]);

	return (
		<div>
			<ImportTabs categories={cats} />

			{batches.length > 0 && (
				<div className="max-w-4xl px-8 pb-12">
					<h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
						Importhistorikk
					</h3>
					<div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
						<table className="min-w-full text-sm">
							<thead className="bg-gray-50 dark:bg-gray-800">
								<tr>
									<th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
										Fil
									</th>
									<th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
										Dato
									</th>
									<th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
										Rader
									</th>
									<th className="px-4 py-2.5 text-left font-medium text-gray-500 dark:text-gray-400">
										Status
									</th>
									<th className="px-4 py-2.5" />
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
								{batches.map((batch) => {
									const rollbackAction = rollbackImport.bind(null, batch.id);
									return (
										<tr key={batch.id}>
											<td className="max-w-[220px] truncate px-4 py-2.5 text-gray-700 dark:text-gray-300">
												{batch.filename}
											</td>
											<td className="whitespace-nowrap px-4 py-2.5 text-gray-700 dark:text-gray-300">
												{format(batch.createdAt, "d. MMM yyyy HH:mm", {
													locale: nb,
												})}
											</td>
											<td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
												{batch.rowCount}
											</td>
											<td className="px-4 py-2.5">
												{batch.rolledBackAt ? (
													<span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
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
													<form action={rollbackAction}>
														<button
															type="submit"
															className="text-xs text-red-600 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
														>
															Angre import
														</button>
													</form>
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
