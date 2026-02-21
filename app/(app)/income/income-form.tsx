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
import type { IncomeFormState } from "./actions";

interface Category {
	id: string;
	name: string;
}

interface IncomeFormProps {
	action: (
		state: IncomeFormState,
		formData: FormData,
	) => Promise<IncomeFormState>;
	defaultDate?: Date;
	defaultAmountNOK?: string;
	defaultSource?: string;
	defaultType?: "salary" | "variable";
	defaultCategoryId?: string;
	categories: Category[];
	submitLabel?: string;
}

export function IncomeForm({
	action,
	defaultDate,
	defaultAmountNOK,
	defaultSource,
	defaultType,
	defaultCategoryId,
	categories,
	submitLabel = "Lagre",
}: IncomeFormProps) {
	const [state, formAction, pending] = useActionState(action, null);

	return (
		<form action={formAction} className="space-y-5">
			<FormError error={state?.error} />

			<CalendarField
				name="date"
				label="Dato"
				defaultDate={defaultDate}
				defaultToToday
				error={state?.fieldErrors?.date?.[0]}
			/>

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

			{/* Source */}
			<div className="space-y-1.5">
				<Label htmlFor="source">Kilde (valgfritt)</Label>
				<Input
					id="source"
					name="source"
					type="text"
					placeholder="f.eks. Arbeidsgiver AS"
					defaultValue={defaultSource}
					className="h-9"
				/>
				{state?.fieldErrors?.source && (
					<p className="text-xs text-red-600">{state.fieldErrors.source[0]}</p>
				)}
			</div>

			{/* Type */}
			<div className="space-y-1.5">
				<Label htmlFor="type">Type</Label>
				<select
					id="type"
					name="type"
					defaultValue={defaultType ?? "salary"}
					className={SELECT_CLASS_NAME}
				>
					<option value="salary">Lønn</option>
					<option value="variable">Variabel inntekt</option>
				</select>
				{state?.fieldErrors?.type && (
					<p className="text-xs text-red-600">{state.fieldErrors.type[0]}</p>
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

			<div className="flex gap-3 pt-1">
				<Button
					type="submit"
					disabled={pending}
					className="bg-indigo-600 hover:bg-indigo-700"
				>
					{pending ? "Lagrer..." : submitLabel}
				</Button>
				<Button type="button" variant="outline" asChild>
					<a href="/income">Avbryt</a>
				</Button>
			</div>
		</form>
	);
}
