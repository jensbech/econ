import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

export const DEFAULT_EXPENSE_CATEGORIES = [
	"Mat & dagligvarer",
	"Transport",
	"Bolig",
	"Helse & apotek",
	"Klær & sko",
	"Underholdning",
	"Restaurant & kafé",
	"Abonnementer",
	"Reise",
	"Barn",
	"Sparing",
	"Annet",
] as const;

export const DEFAULT_INCOME_CATEGORIES = [
	"Lønn",
	"Variabel inntekt",
	"Annet",
] as const;

export async function seedDefaultCategories(
	householdId: string,
): Promise<void> {
	const existing = await db
		.select({ id: categories.id })
		.from(categories)
		.where(
			and(
				eq(categories.householdId, householdId),
				isNull(categories.deletedAt),
			),
		)
		.limit(1);

	if (existing.length > 0) return;

	const expenseCats = DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
		householdId,
		name,
		type: "expense" as const,
		isDefault: true,
	}));

	const incomeCats = DEFAULT_INCOME_CATEGORIES.map((name) => ({
		householdId,
		name,
		type: "income" as const,
		isDefault: true,
	}));

	await db.insert(categories).values([...expenseCats, ...incomeCats]);
}
