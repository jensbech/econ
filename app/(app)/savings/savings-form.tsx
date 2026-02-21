"use client";

import { useActionState } from "react";
import { CalendarField, FormError } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SavingsFormState } from "./actions";

interface SavingsFormProps {
	action: (
		state: SavingsFormState,
		formData: FormData,
	) => Promise<SavingsFormState>;
	defaultName?: string;
	defaultTargetNOK?: string;
	defaultTargetDate?: Date;
	submitLabel?: string;
	cancelHref?: string;
}

export function SavingsForm({
	action,
	defaultName,
	defaultTargetNOK,
	defaultTargetDate,
	submitLabel = "Lagre",
	cancelHref = "/savings",
}: SavingsFormProps) {
	const [state, formAction, pending] = useActionState(action, null);

	return (
		<form action={formAction} className="space-y-5">
			<FormError error={state?.error} />

			{/* Name */}
			<div className="space-y-1.5">
				<Label htmlFor="name">Navn på sparemål</Label>
				<Input
					id="name"
					name="name"
					type="text"
					placeholder="f.eks. Ferietur til Italia"
					defaultValue={defaultName}
					className="h-9"
				/>
				{state?.fieldErrors?.name && (
					<p className="text-xs text-red-600">{state.fieldErrors.name[0]}</p>
				)}
			</div>

			{/* Target amount */}
			<div className="space-y-1.5">
				<Label htmlFor="targetAmount">Målbeløp (NOK)</Label>
				<Input
					id="targetAmount"
					name="targetAmount"
					type="number"
					step="0.01"
					min="0.01"
					placeholder="0.00"
					defaultValue={defaultTargetNOK}
					className="h-9"
				/>
				{state?.fieldErrors?.targetAmount && (
					<p className="text-xs text-red-600">
						{state.fieldErrors.targetAmount[0]}
					</p>
				)}
			</div>

			<CalendarField
				name="targetDate"
				label="Måldato (valgfritt)"
				defaultDate={defaultTargetDate}
				placeholder="Velg dato (valgfritt)"
				clearable
			/>

			<div className="flex gap-3 pt-1">
				<Button
					type="submit"
					disabled={pending}
					className="bg-indigo-600 hover:bg-indigo-700"
				>
					{pending ? "Lagrer..." : submitLabel}
				</Button>
				<Button type="button" variant="outline" asChild>
					<a href={cancelHref}>Avbryt</a>
				</Button>
			</div>
		</form>
	);
}
