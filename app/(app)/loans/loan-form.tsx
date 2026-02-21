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
import type { LoanFormState } from "./actions";

interface LoanFormProps {
	action: (state: LoanFormState, formData: FormData) => Promise<LoanFormState>;
	defaultName?: string;
	defaultType?: "mortgage" | "student";
	defaultPrincipalNOK?: string;
	defaultInterestRate?: string;
	defaultTermMonths?: string;
	defaultStartDate?: Date;
	submitLabel?: string;
	cancelHref?: string;
}

export function LoanForm({
	action,
	defaultName,
	defaultType,
	defaultPrincipalNOK,
	defaultInterestRate,
	defaultTermMonths,
	defaultStartDate,
	submitLabel = "Lagre",
	cancelHref = "/loans",
}: LoanFormProps) {
	const [state, formAction, pending] = useActionState(action, null);

	return (
		<form action={formAction} className="space-y-5">
			<FormError error={state?.error} />

			{/* Name */}
			<div className="space-y-1.5">
				<Label htmlFor="name">Lånebeskrivelse</Label>
				<Input
					id="name"
					name="name"
					type="text"
					placeholder="f.eks. Boliglån DNB"
					defaultValue={defaultName}
					className="h-9"
				/>
				{state?.fieldErrors?.name && (
					<p className="text-xs text-red-600">{state.fieldErrors.name[0]}</p>
				)}
			</div>

			{/* Type */}
			<div className="space-y-1.5">
				<Label htmlFor="type">Lånetype</Label>
				<select
					id="type"
					name="type"
					defaultValue={defaultType ?? "mortgage"}
					className={SELECT_CLASS_NAME}
				>
					<option value="mortgage">Boliglån</option>
					<option value="student">Studielån</option>
				</select>
				{state?.fieldErrors?.type && (
					<p className="text-xs text-red-600">{state.fieldErrors.type[0]}</p>
				)}
			</div>

			{/* Principal */}
			<div className="space-y-1.5">
				<Label htmlFor="principal">Opprinnelig lånebeløp (NOK)</Label>
				<Input
					id="principal"
					name="principal"
					type="number"
					step="0.01"
					min="0"
					placeholder="0.00"
					defaultValue={defaultPrincipalNOK}
					className="h-9"
				/>
				{state?.fieldErrors?.principal && (
					<p className="text-xs text-red-600">
						{state.fieldErrors.principal[0]}
					</p>
				)}
			</div>

			{/* Interest rate */}
			<div className="space-y-1.5">
				<Label htmlFor="interestRate">Nominell rente (%)</Label>
				<Input
					id="interestRate"
					name="interestRate"
					type="number"
					step="0.01"
					min="0"
					placeholder="5.00"
					defaultValue={defaultInterestRate}
					className="h-9"
				/>
				{state?.fieldErrors?.interestRate && (
					<p className="text-xs text-red-600">
						{state.fieldErrors.interestRate[0]}
					</p>
				)}
			</div>

			{/* Term months */}
			<div className="space-y-1.5">
				<Label htmlFor="termMonths">Løpetid (måneder)</Label>
				<Input
					id="termMonths"
					name="termMonths"
					type="number"
					step="1"
					min="1"
					placeholder="360"
					defaultValue={defaultTermMonths}
					className="h-9"
				/>
				{state?.fieldErrors?.termMonths && (
					<p className="text-xs text-red-600">
						{state.fieldErrors.termMonths[0]}
					</p>
				)}
			</div>

			<CalendarField
				name="startDate"
				label="Startdato"
				defaultDate={defaultStartDate}
				defaultToToday
				error={state?.fieldErrors?.startDate?.[0]}
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
