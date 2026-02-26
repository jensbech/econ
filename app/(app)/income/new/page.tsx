import { and, eq, isNull } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { getVisibleAccounts } from "@/lib/accounts";
import { createIncome } from "../actions";
import { IncomeForm } from "../income-form";

export default async function NewIncomePage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const cookieStore = await cookies();
	const selectedRaw = cookieStore.get("selectedAccounts")?.value ?? "";
	const selectedIds = selectedRaw.split(",").filter(Boolean);

	const [incomeCategories, visibleAccounts] = await Promise.all([
		householdId
			? db
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
			: [],
		householdId
			? getVisibleAccounts(user.id as string, householdId)
			: [],
	]);

	const defaultAccountId =
		selectedIds.length === 1 &&
		visibleAccounts.some((a) => a.id === selectedIds[0])
			? selectedIds[0]
			: undefined;

	return (
		<div className="mx-auto max-w-lg space-y-6 p-4 sm:p-8">
			<div>
				<Link
					href="/income"
					className="mb-3 inline-flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-foreground dark:text-foreground/50 dark:hover:text-card-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Tilbake til inntekter
				</Link>
				<h1 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
					Ny inntekt
				</h1>
				<p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
					Registrer en ny inntekt for husholdningen.
				</p>
			</div>

			<div className="rounded-xl border border-border bg-card p-6 dark:border-border/40 dark:bg-card">
				<IncomeForm
					action={createIncome}
					categories={incomeCategories}
					accounts={visibleAccounts}
					defaultAccountId={defaultAccountId}
					submitLabel="Legg til inntekt"
				/>
			</div>
		</div>
	);
}
