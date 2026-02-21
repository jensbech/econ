import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { createIncome } from "../actions";
import { IncomeForm } from "../income-form";

export default async function NewIncomePage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const incomeCategories = householdId
		? await db
				.select({ id: categories.id, name: categories.name })
				.from(categories)
				.where(
					and(
						eq(categories.householdId, householdId),
						eq(categories.type, "income"),
						isNull(categories.deletedAt),
					),
				)
				.orderBy(categories.name)
		: [];

	return (
		<div className="mx-auto max-w-lg space-y-6 p-8">
			<div>
				<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
					Ny inntekt
				</h1>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Registrer en ny inntekt for husholdningen.
				</p>
			</div>

			<div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<IncomeForm
					action={createIncome}
					categories={incomeCategories}
					submitLabel="Legg til inntekt"
				/>
			</div>
		</div>
	);
}
