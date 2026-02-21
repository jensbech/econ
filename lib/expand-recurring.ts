import {
	addDays,
	endOfMonth,
	format,
	getDate,
	getDay,
	getMonth,
	isBefore,
	isEqual,
	parseISO,
	startOfMonth,
} from "date-fns";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { expenses, incomeEntries, recurringTemplates } from "@/db/schema";

type TemplateFrequency = "weekly" | "monthly" | "annual";

interface TemplateInfo {
	startDate: string;
	endDate: string | null;
	frequency: TemplateFrequency;
}

/**
 * Compute the date strings (yyyy-MM-dd) that a recurring template fires within the given month.
 */
function getDatesForMonth(template: TemplateInfo, month: Date): string[] {
	const start = parseISO(`${template.startDate}T12:00:00`);
	const monthStart = startOfMonth(month);
	const monthEnd = endOfMonth(month);

	// If template starts after the end of this month, no dates
	if (isBefore(monthEnd, start) && !isEqual(monthEnd, start)) return [];

	// If template has ended before this month starts, no dates
	if (template.endDate) {
		const end = parseISO(`${template.endDate}T12:00:00`);
		if (isBefore(end, monthStart)) return [];
	}

	const dates: string[] = [];

	if (template.frequency === "monthly") {
		const dayOfMonth = getDate(start);
		const daysInMonth = getDate(monthEnd);
		const actualDay = Math.min(dayOfMonth, daysInMonth);
		const firingDate = new Date(
			month.getFullYear(),
			month.getMonth(),
			actualDay,
		);

		if (!isBefore(firingDate, start) || isEqual(firingDate, start)) {
			const dateStr = format(firingDate, "yyyy-MM-dd");
			if (!template.endDate || dateStr <= template.endDate) {
				dates.push(dateStr);
			}
		}
	} else if (template.frequency === "weekly") {
		const targetDayOfWeek = getDay(start);

		// Start from the later of monthStart or startDate
		let d = isBefore(start, monthStart)
			? new Date(monthStart)
			: new Date(start);

		// Advance to the first target day of week on or after d
		while (getDay(d) !== targetDayOfWeek) {
			d = addDays(d, 1);
		}

		while (!isBefore(monthEnd, d)) {
			const dateStr = format(d, "yyyy-MM-dd");
			if (!template.endDate || dateStr <= template.endDate) {
				dates.push(dateStr);
			}
			d = addDays(d, 7);
		}
	} else if (template.frequency === "annual") {
		if (getMonth(start) === getMonth(month)) {
			const dayOfMonth = getDate(start);
			const daysInMonth = getDate(monthEnd);
			const actualDay = Math.min(dayOfMonth, daysInMonth);
			const firingDate = new Date(
				month.getFullYear(),
				month.getMonth(),
				actualDay,
			);

			if (!isBefore(firingDate, start) || isEqual(firingDate, start)) {
				const dateStr = format(firingDate, "yyyy-MM-dd");
				if (!template.endDate || dateStr <= template.endDate) {
					dates.push(dateStr);
				}
			}
		}
	}

	return dates;
}

/**
 * For a given household and month, generate expense rows from active recurring templates
 * if they don't already exist. Idempotent.
 */
export async function expandRecurringExpenses(
	householdId: string,
	month: Date,
): Promise<void> {
	// Get all active expense templates for this household
	const templates = await db
		.select()
		.from(recurringTemplates)
		.where(
			and(
				eq(recurringTemplates.householdId, householdId),
				eq(recurringTemplates.type, "expense"),
				isNull(recurringTemplates.deletedAt),
			),
		);

	// Compute all (templateId, dateStr) pairs that should exist this month
	type PendingEntry = {
		templateId: string;
		dateStr: string;
		template: (typeof templates)[0];
	};
	const pending: PendingEntry[] = [];

	for (const template of templates) {
		const dates = getDatesForMonth(
			{
				startDate: template.startDate,
				endDate: template.endDate ?? null,
				frequency: template.frequency,
			},
			month,
		);
		for (const dateStr of dates) {
			pending.push({ templateId: template.id, dateStr, template });
		}
	}

	if (pending.length === 0) return;

	// Single query to find all already-existing expenses for these templates this month
	const templateIds = [...new Set(pending.map((p) => p.templateId))];
	const dateStrs = [...new Set(pending.map((p) => p.dateStr))];

	const existing = await db
		.select({
			recurringTemplateId: expenses.recurringTemplateId,
			date: expenses.date,
		})
		.from(expenses)
		.where(
			and(
				inArray(expenses.recurringTemplateId, templateIds),
				inArray(expenses.date, dateStrs),
				isNull(expenses.deletedAt),
			),
		);

	const existingSet = new Set(
		existing.map((e) => `${e.recurringTemplateId}:${e.date}`),
	);

	// Bulk insert only the missing entries
	const toInsert = pending.filter(
		({ templateId, dateStr }) => !existingSet.has(`${templateId}:${dateStr}`),
	);

	if (toInsert.length === 0) return;

	await db.insert(expenses).values(
		toInsert.map(({ dateStr, template }) => ({
			householdId,
			userId: template.userId,
			categoryId: template.categoryId ?? null,
			amountOere: template.amountOere,
			date: dateStr,
			notes: template.description,
			recurringTemplateId: template.id,
		})),
	);
}

/**
 * For a given household and month, generate income_entry rows from active recurring income
 * templates if they don't already exist. Idempotent.
 */
export async function expandRecurringIncome(
	householdId: string,
	month: Date,
): Promise<void> {
	const templates = await db
		.select()
		.from(recurringTemplates)
		.where(
			and(
				eq(recurringTemplates.householdId, householdId),
				eq(recurringTemplates.type, "income"),
				isNull(recurringTemplates.deletedAt),
			),
		);

	// Compute all (templateId, dateStr) pairs that should exist this month
	type PendingIncomeEntry = {
		templateId: string;
		dateStr: string;
		template: (typeof templates)[0];
	};
	const pending: PendingIncomeEntry[] = [];

	for (const template of templates) {
		const dates = getDatesForMonth(
			{
				startDate: template.startDate,
				endDate: template.endDate ?? null,
				frequency: template.frequency,
			},
			month,
		);
		for (const dateStr of dates) {
			pending.push({ templateId: template.id, dateStr, template });
		}
	}

	if (pending.length === 0) return;

	// Single query to find all already-existing income entries for these templates this month
	const templateIds = [...new Set(pending.map((p) => p.templateId))];
	const dateStrs = [...new Set(pending.map((p) => p.dateStr))];

	const existing = await db
		.select({
			recurringTemplateId: incomeEntries.recurringTemplateId,
			date: incomeEntries.date,
		})
		.from(incomeEntries)
		.where(
			and(
				inArray(incomeEntries.recurringTemplateId, templateIds),
				inArray(incomeEntries.date, dateStrs),
				isNull(incomeEntries.deletedAt),
			),
		);

	const existingSet = new Set(
		existing.map((e) => `${e.recurringTemplateId}:${e.date}`),
	);

	// Bulk insert only the missing entries
	const toInsert = pending.filter(
		({ templateId, dateStr }) => !existingSet.has(`${templateId}:${dateStr}`),
	);

	if (toInsert.length === 0) return;

	await db.insert(incomeEntries).values(
		toInsert.map(({ dateStr, template }) => ({
			householdId,
			userId: template.userId,
			categoryId: template.categoryId ?? null,
			amountOere: template.amountOere,
			date: dateStr,
			source: template.description,
			type: "salary" as const,
			recurringTemplateId: template.id,
		})),
	);
}
