import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { createRecurringTemplate } from "../actions";
import { RecurringForm } from "../recurring-form";

export default async function NewRecurringExpensePage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const expenseCategories = householdId
		? await db
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
		: [];

	return (
		<div className="mx-auto max-w-lg space-y-6 p-8">
			<div>
				<h1 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
					Ny gjentagende utgift
				</h1>
				<p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
					Sett opp en fast eller gjentagende utgift som genereres automatisk.
				</p>
			</div>

			<div className="rounded-xl border border-border bg-card p-6 dark:border-border/40 dark:bg-card">
				<RecurringForm
					action={createRecurringTemplate}
					categories={expenseCategories}
					submitLabel="Opprett regel"
				/>
			</div>
		</div>
	);
}
