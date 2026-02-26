"use client";

import { useActionState } from "react";
import {
	CalendarField,
	FormError,
	SELECT_CLASS_NAME,
} from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TemplateFormState } from "./actions";

interface Category {
	id: string;
	name: string;
}

interface RecurringFormProps {
	action: (
		state: TemplateFormState,
		formData: FormData,
	) => Promise<TemplateFormState>;
	defaultDescription?: string;
	defaultAmountNOK?: string;
	defaultCategoryId?: string;
	defaultFrequency?: string;
	defaultStartDate?: Date;
	defaultEndDate?: Date;
	categories: Category[];
	submitLabel?: string;
}

const FREQUENCY_OPTIONS = [
	{ value: "monthly", label: "Månedlig" },
	{ value: "weekly", label: "Ukentlig" },
	{ value: "annual", label: "Årlig" },
];

export function RecurringForm({
	action,
	defaultDescription,
	defaultAmountNOK,
	defaultCategoryId,
	defaultFrequency = "monthly",
	defaultStartDate,
	defaultEndDate,
	categories,
	submitLabel = "Lagre",
}: RecurringFormProps) {
	const [state, formAction, pending] = useActionState(action, null);

	return (
		<form action={formAction} className="space-y-5">
			<FormError error={state?.error} />

			{/* Description */}
			<div className="space-y-1.5">
				<Label htmlFor="description">Beskrivelse</Label>
				<Input
					id="description"
					name="description"
					type="text"
					placeholder="f.eks. Strøm, Netflix, Husleie"
					defaultValue={defaultDescription}
					className="h-9"
				/>
				{state?.fieldErrors?.description && (
					<p className="text-xs text-red-600">
						{state.fieldErrors.description[0]}
					</p>
				)}
			</div>

			{/* Amount */}
			<div className="space-y-1.5">
				<Label htmlFor="amount">Beløp (NOK)</Label>
				<Input
					id="amount"
					name="amount"
					type="number"
					step="0.01"
					min="0"
					placeholder="0.00"
					defaultValue={defaultAmountNOK}
					className="h-9"
				/>
				{state?.fieldErrors?.amount && (
					<p className="text-xs text-red-600">{state.fieldErrors.amount[0]}</p>
				)}
			</div>

			{/* Category */}
			<div className="space-y-1.5">
				<Label htmlFor="categoryId">Kategori</Label>
				<select
					id="categoryId"
					name="categoryId"
					defaultValue={defaultCategoryId ?? ""}
					className={SELECT_CLASS_NAME}
				>
					<option value="">Ingen kategori</option>
					{categories.map((cat) => (
						<option key={cat.id} value={cat.id}>
							{cat.name}
						</option>
					))}
				</select>
			</div>

			{/* Frequency */}
			<div className="space-y-1.5">
				<Label htmlFor="frequency">Frekvens</Label>
				<select
					id="frequency"
					name="frequency"
					defaultValue={defaultFrequency}
					className={SELECT_CLASS_NAME}
				>
					{FREQUENCY_OPTIONS.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
				{state?.fieldErrors?.frequency && (
					<p className="text-xs text-red-600">
						{state.fieldErrors.frequency[0]}
					</p>
				)}
			</div>

			<CalendarField
				name="startDate"
				label="Startdato"
				defaultDate={defaultStartDate}
				defaultToToday
				placeholder="Velg startdato"
				error={state?.fieldErrors?.startDate?.[0]}
			/>

			<CalendarField
				name="endDate"
				label="Sluttdato (valgfritt)"
				defaultDate={defaultEndDate}
				placeholder="Ingen sluttdato"
				clearable
			/>

			<div className="flex gap-3 pt-1">
				<Button
					type="submit"
					disabled={pending}
					className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
				>
					{pending ? "Lagrer..." : submitLabel}
				</Button>
				<Button type="button" variant="outline" asChild>
					<a href="/expenses/recurring">Avbryt</a>
				</Button>
			</div>
		</form>
	);
}
