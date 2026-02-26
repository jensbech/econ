import { and, eq, isNull } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { addCategory } from "./actions";
import { CategoryItem } from "./category-item";

export default async function CategoriesPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id);

	const allCategories = householdId
		? await db
				.select()
				.from(categories)
				.where(
					and(
						eq(categories.householdId, householdId),
						isNull(categories.deletedAt),
					),
				)
				.orderBy(categories.name)
		: [];

	const expenseCategories = allCategories.filter((c) => c.type === "expense");
	const incomeCategories = allCategories.filter((c) => c.type === "income");

	return (
		<div className="mx-auto max-w-2xl space-y-8 p-8">
			<div>
				<h1 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
					Kategorier
				</h1>
				<p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
					Administrer utgifts- og inntektskategorier for husholdningen.
				</p>
			</div>

			{/* Add category form */}
			<section className="rounded-xl border border-border bg-card p-6 dark:border-border/40 dark:bg-card">
				<h2 className="mb-4 text-sm font-semibold text-foreground/80 dark:text-foreground/80">
					Legg til kategori
				</h2>
				<form action={addCategory} className="flex items-end gap-3">
					<div className="flex-1 space-y-1.5">
						<Label htmlFor="name">Navn</Label>
						<Input
							id="name"
							name="name"
							placeholder="Kategori navn"
							required
							className="h-9"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="type">Type</Label>
						<select
							id="type"
							name="type"
							defaultValue="expense"
							className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:border-border/40 dark:bg-card dark:text-card-foreground"
						>
							<option value="expense">Utgift</option>
							<option value="income">Inntekt</option>
						</select>
					</div>
					<Button
						type="submit"
						className="h-9 bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
					>
						Legg til
					</Button>
				</form>
			</section>

			{/* Expense categories */}
			<section className="space-y-3">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold text-foreground/80 dark:text-foreground/80">
						Utgiftskategorier
					</h2>
					<span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
						{expenseCategories.length}
					</span>
				</div>
				{expenseCategories.length === 0 ? (
					<p className="py-4 text-center text-sm text-foreground/50">
						Ingen utgiftskategorier ennå.
					</p>
				) : (
					<div className="space-y-2">
						{expenseCategories.map((cat) => (
							<CategoryItem
								key={cat.id}
								id={cat.id}
								name={cat.name}
								isDefault={cat.isDefault}
							/>
						))}
					</div>
				)}
			</section>

			{/* Income categories */}
			<section className="space-y-3">
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-semibold text-foreground/80 dark:text-foreground/80">
						Inntektskategorier
					</h2>
					<span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
						{incomeCategories.length}
					</span>
				</div>
				{incomeCategories.length === 0 ? (
					<p className="py-4 text-center text-sm text-foreground/50">
						Ingen inntektskategorier ennå.
					</p>
				) : (
					<div className="space-y-2">
						{incomeCategories.map((cat) => (
							<CategoryItem
								key={cat.id}
								id={cat.id}
								name={cat.name}
								isDefault={cat.isDefault}
							/>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
