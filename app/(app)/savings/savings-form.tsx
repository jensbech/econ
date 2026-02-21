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
import type { SavingsFormState } from "./actions";

interface AccountOption {
	id: string;
	name: string;
}

interface SavingsFormProps {
	action: (
		state: SavingsFormState,
		formData: FormData,
	) => Promise<SavingsFormState>;
	defaultName?: string;
	defaultTargetNOK?: string;
	defaultTargetDate?: Date;
	defaultAccountId?: string;
	accounts?: AccountOption[];
	submitLabel?: string;
	cancelHref?: string;
}

export function SavingsForm({
	action,
	defaultName,
	defaultTargetNOK,
	defaultTargetDate,
	defaultAccountId,
	accounts = [],
	submitLabel = "Lagre",
	cancelHref = "/savings",
}: SavingsFormProps) {
	const [state, formAction, pending] = useActionState(action, null);

	return (
		<form action={formAction} className="space-y-5">
			<FormError error={state?.error} />

			{/* Name */}
			<div className="space-y-1.5">
				<Label htmlFor="name">Navn på sparekonto</Label>
				<Input
					id="name"
					name="name"
					type="text"
					placeholder="f.eks. Ferietur, Bufferkonto"
					defaultValue={defaultName}
					className="h-9"
				/>
				{state?.fieldErrors?.name && (
					<p className="text-xs text-red-600">{state.fieldErrors.name[0]}</p>
				)}
			</div>

			{/* Target amount (optional) */}
			<div className="space-y-1.5">
				<Label htmlFor="targetAmount">Målbeløp (NOK, valgfritt)</Label>
				<Input
					id="targetAmount"
					name="targetAmount"
					type="text"
					inputMode="decimal"
					pattern="[0-9]*[.,]?[0-9]*"
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

			{/* Account */}
			{accounts.length > 0 && (
				<div className="space-y-1.5">
					<Label htmlFor="accountId">Tilknyttet konto (valgfritt)</Label>
					<select
						id="accountId"
						name="accountId"
						defaultValue={defaultAccountId ?? ""}
						className={SELECT_CLASS_NAME}
					>
						<option value="">Ingen konto</option>
						{accounts.map((acc) => (
							<option key={acc.id} value={acc.id}>
								{acc.name}
							</option>
						))}
					</select>
				</div>
			)}

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
