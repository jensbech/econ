"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accounts, categories, incomeEntries } from "@/db/schema";
import { logCreate, logDelete, logUpdate } from "@/lib/audit";
import { validateCsrfOrigin } from "@/lib/csrf-validate";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { checkRateLimit } from "@/lib/rate-limit";
import {
	extractFieldErrors,
	nokToOere,
	parseDateToIso,
} from "@/lib/server-utils";

export type IncomeFormState = {
	error?: string | null;
	fieldErrors?: Record<string, string[]>;
	warning?: string | null;
	duplicateWarning?: boolean;
} | null;

const IncomeSchema = z.object({
	date: z
		.string()
		.min(1, "Dato er påkrevd")
		.refine((d) => parseDateToIso(d) !== null, "Ugyldig dato"),
	amount: z.string().min(1, "Beløp er påkrevd"),
	source: z.string().max(500).optional(),
	type: z.enum(["salary", "variable"]),
	categoryId: z.string().optional(),
	accountId: z.string().optional(),
});

export async function createIncome(
	_prevState: IncomeFormState,
	formData: FormData,
): Promise<IncomeFormState> {
	await validateCsrfOrigin();
	const user = await verifySession();

	try {
		checkRateLimit(`income:create:${user.id}`, 20, 60);
	} catch {
		return { error: "Too many income creations. Please try again later." };
	}

	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const force = formData.get("force") === "true";

	const raw = {
		date: formData.get("date") as string,
		amount: formData.get("amount") as string,
		source: (formData.get("source") as string) || undefined,
		type: formData.get("type") as string,
		categoryId: (formData.get("categoryId") as string) || undefined,
		accountId: (formData.get("accountId") as string) || undefined,
	};

	const parsed = IncomeSchema.safeParse(raw);
	if (!parsed.success) {
		return { fieldErrors: extractFieldErrors(parsed.error) };
	}

	let amountOere: number;
	try {
		amountOere = nokToOere(parsed.data.amount);
	} catch {
		return { fieldErrors: { amount: ["Ugyldig beløp"] } };
	}

	// Validate category belongs to this household
	if (parsed.data.categoryId) {
		const [cat] = await db
			.select({ id: categories.id })
			.from(categories)
			.where(
				and(
					eq(categories.id, parsed.data.categoryId),
					eq(categories.householdId, householdId),
					isNull(categories.deletedAt),
				),
			)
			.limit(1);
		if (!cat) return { fieldErrors: { categoryId: ["Ugyldig kategori"] } };
	}

	// Validate accountId belongs to this household (CRIT-02)
	if (parsed.data.accountId) {
		const [acct] = await db
			.select({ id: accounts.id })
			.from(accounts)
			.where(
				and(
					eq(accounts.id, parsed.data.accountId),
					eq(accounts.householdId, householdId),
					isNull(accounts.deletedAt),
				),
			)
			.limit(1);
		if (!acct) return { fieldErrors: { accountId: ["Ugyldig konto"] } };
	}

	// Duplicate check: warn if same amount+date already exists
	if (!force) {
		const [dup] = await db
			.select({ id: incomeEntries.id })
			.from(incomeEntries)
			.where(
				and(
					eq(incomeEntries.householdId, householdId),
					isNull(incomeEntries.deletedAt),
					eq(incomeEntries.date, parsed.data.date),
					sql`${incomeEntries.amountOere} = ${amountOere}`,
				),
			)
			.limit(1);
		if (dup) {
			const nokStr = (amountOere / 100).toLocaleString("nb-NO", {
				minimumFractionDigits: 2,
			});
			return {
				duplicateWarning: true,
				warning: `Det finnes allerede en inntekt på kr ${nokStr} for ${parsed.data.date}. Er du sikker på at dette ikke er en duplikat?`,
			};
		}
	}

	const [inserted] = await db
		.insert(incomeEntries)
		.values({
			householdId,
			userId: user.id as string,
			categoryId: parsed.data.categoryId ?? null,
			accountId: parsed.data.accountId ?? null,
			amountOere,
			date: parsed.data.date,
			source: parsed.data.source ?? null,
			type: parsed.data.type,
		})
		.returning({ id: incomeEntries.id });

	if (inserted) {
		await logCreate(householdId, user.id as string, "income", inserted.id, {
			amount: amountOere,
			date: parsed.data.date,
			type: parsed.data.type,
			category: parsed.data.categoryId,
		});
	}

	revalidatePath("/income");
	redirect("/income");
}

export async function updateIncome(
	id: string,
	_prevState: IncomeFormState,
	formData: FormData,
): Promise<IncomeFormState> {
	await validateCsrfOrigin();
	const user = await verifySession();

	try {
		checkRateLimit(`income:update:${user.id}`, 20, 60);
	} catch {
		return { error: "Too many income updates. Please try again later." };
	}

	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) return { error: "Ingen husholdning funnet" };

	const raw = {
		date: formData.get("date") as string,
		amount: formData.get("amount") as string,
		source: (formData.get("source") as string) || undefined,
		type: formData.get("type") as string,
		categoryId: (formData.get("categoryId") as string) || undefined,
		accountId: (formData.get("accountId") as string) || undefined,
	};

	const parsed = IncomeSchema.safeParse(raw);
	if (!parsed.success) {
		return { fieldErrors: extractFieldErrors(parsed.error) };
	}

	let amountOere: number;
	try {
		amountOere = nokToOere(parsed.data.amount);
	} catch {
		return { fieldErrors: { amount: ["Ugyldig beløp"] } };
	}

	// Validate category belongs to this household
	if (parsed.data.categoryId) {
		const [cat] = await db
			.select({ id: categories.id })
			.from(categories)
			.where(
				and(
					eq(categories.id, parsed.data.categoryId),
					eq(categories.householdId, householdId),
					isNull(categories.deletedAt),
				),
			)
			.limit(1);
		if (!cat) return { fieldErrors: { categoryId: ["Ugyldig kategori"] } };
	}

	// Validate accountId belongs to this household (CRIT-02)
	if (parsed.data.accountId) {
		const [acct] = await db
			.select({ id: accounts.id })
			.from(accounts)
			.where(
				and(
					eq(accounts.id, parsed.data.accountId),
					eq(accounts.householdId, householdId),
					isNull(accounts.deletedAt),
				),
			)
			.limit(1);
		if (!acct) return { fieldErrors: { accountId: ["Ugyldig konto"] } };
	}

	await db
		.update(incomeEntries)
		.set({
			categoryId: parsed.data.categoryId ?? null,
			accountId: parsed.data.accountId ?? null,
			amountOere,
			date: parsed.data.date,
			source: parsed.data.source ?? null,
			type: parsed.data.type,
			// Editing a single occurrence unlinks it from any recurring template
			recurringTemplateId: null,
		})
		.where(
			and(
				eq(incomeEntries.id, id),
				eq(incomeEntries.householdId, householdId),
				isNull(incomeEntries.deletedAt),
			),
		);

	await logUpdate(householdId, user.id as string, "income", id, {
		amount: amountOere,
		date: parsed.data.date,
		type: parsed.data.type,
		category: parsed.data.categoryId,
	});

	revalidatePath("/income");
	redirect("/income");
}

export async function deleteIncome(id: string): Promise<void> {
	await validateCsrfOrigin();
	const user = await verifySession();

	try {
		checkRateLimit(`income:delete:${user.id}`, 10, 60);
	} catch {
		throw new Error("Rate limit exceeded. Please try again later.");
	}

	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	const [income] = await db
		.select({ id: incomeEntries.id })
		.from(incomeEntries)
		.where(
			and(
				eq(incomeEntries.id, id),
				eq(incomeEntries.householdId, householdId),
				isNull(incomeEntries.deletedAt),
			),
		)
		.limit(1);

	if (!income) throw new Error("Income not found or access denied");

	await db
		.update(incomeEntries)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(incomeEntries.id, id),
				eq(incomeEntries.householdId, householdId),
				isNull(incomeEntries.deletedAt),
			),
		);

	await logDelete(
		householdId,
		user.id as string,
		"income",
		id,
		"User initiated deletion",
	);

	revalidatePath("/income");
	redirect("/income");
}

// Deletes without redirect — used from the income list table
export async function deleteIncomeNoRedirect(id: string): Promise<void> {
	await validateCsrfOrigin();
	const user = await verifySession();

	try {
		checkRateLimit(`income:delete:${user.id}`, 10, 60);
	} catch {
		throw new Error("Rate limit exceeded. Please try again later.");
	}

	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) throw new Error("Ingen husholdning funnet");

	const [income] = await db
		.select({ id: incomeEntries.id })
		.from(incomeEntries)
		.where(
			and(
				eq(incomeEntries.id, id),
				eq(incomeEntries.householdId, householdId),
				isNull(incomeEntries.deletedAt),
			),
		)
		.limit(1);

	if (!income) throw new Error("Income not found or access denied");

	await db
		.update(incomeEntries)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(incomeEntries.id, id),
				eq(incomeEntries.householdId, householdId),
				isNull(incomeEntries.deletedAt),
			),
		);

	await logDelete(
		householdId,
		user.id as string,
		"income",
		id,
		"User initiated deletion",
	);

	revalidatePath("/income");
}
