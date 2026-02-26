import { parse } from "date-fns";
import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { categories, recurringTemplates } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { updateRecurringTemplate } from "../../actions";
import { RecurringForm } from "../../recurring-form";

export default async function EditRecurringExpensePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) notFound();

	const [template] = await db
		.select()
		.from(recurringTemplates)
		.where(
			and(
				eq(recurringTemplates.id, id),
				eq(recurringTemplates.householdId, householdId),
				eq(recurringTemplates.type, "expense"),
				isNull(recurringTemplates.deletedAt),
			),
		)
		.limit(1);

	if (!template) notFound();

	const expenseCategories = await db
		.select({ id: categories.id, name: categories.name })
		.from(categories)
		.where(
			and(
				eq(categories.householdId, householdId),
				eq(categories.type, "expense"),
				isNull(categories.deletedAt),
			),
		)
		.orderBy(categories.name);

	const updateAction = updateRecurringTemplate.bind(null, template.id);

	const defaultAmountNOK = (template.amountOere / 100).toFixed(2);
	const defaultStartDate = template.startDate
		? parse(template.startDate, "yyyy-MM-dd", new Date())
		: undefined;
	const defaultEndDate = template.endDate
		? parse(template.endDate, "yyyy-MM-dd", new Date())
		: undefined;

	return (
		<div className="mx-auto max-w-lg space-y-6 p-8">
			<div>
				<h1 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
					Rediger gjentagende utgift
				</h1>
				<p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
					Fremtidige forekomster vil oppdateres. Tidligere utgifter beholdes.
				</p>
			</div>

			<div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
				Lagring vil slette fremtidige, ikke-betalte forekomster og generere nye
				basert på de oppdaterte verdiene.
			</div>

			<div className="rounded-xl border border-border bg-card p-6 dark:border-border/40 dark:bg-card">
				<RecurringForm
					action={updateAction}
					defaultDescription={template.description}
					defaultAmountNOK={defaultAmountNOK}
					defaultCategoryId={template.categoryId ?? undefined}
					defaultFrequency={template.frequency}
					defaultStartDate={defaultStartDate}
					defaultEndDate={defaultEndDate}
					categories={expenseCategories}
					submitLabel="Lagre endringer"
				/>
			</div>
		</div>
	);
}
