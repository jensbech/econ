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

interface AccountOption {
	id: string;
	name: string;
}

interface LoanFormProps {
	action: (state: LoanFormState, formData: FormData) => Promise<LoanFormState>;
	defaultName?: string;
	defaultType?: string;
	defaultPrincipalNOK?: string;
	defaultInterestRate?: string;
	defaultTermMonths?: string;
	defaultStartDate?: Date;
	defaultAccountId?: string;
	defaultOpeningBalanceNOK?: string;
	defaultOpeningBalanceDate?: Date;
	accounts?: AccountOption[];
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
	defaultAccountId,
	defaultOpeningBalanceNOK,
	defaultOpeningBalanceDate,
	accounts = [],
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
					<p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
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
					<option value="car">Billån</option>
					<option value="consumer">Forbrukslån</option>
					<option value="other">Annet</option>
				</select>
				{state?.fieldErrors?.type && (
					<p className="text-xs text-destructive">{state.fieldErrors.type[0]}</p>
				)}
			</div>

			{/* Principal */}
			<div className="space-y-1.5">
				<Label htmlFor="principal">Opprinnelig lånebeløp (NOK)</Label>
				<Input
					id="principal"
					name="principal"
					type="text"
					inputMode="decimal"
					pattern="[0-9]*[.,]?[0-9]*"
					placeholder="0.00"
					defaultValue={defaultPrincipalNOK}
					className="h-9"
				/>
				{state?.fieldErrors?.principal && (
					<p className="text-xs text-destructive">
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
					type="text"
					inputMode="decimal"
					pattern="[0-9]*[.,]?[0-9]*"
					placeholder="5.00"
					defaultValue={defaultInterestRate}
					className="h-9"
				/>
				{state?.fieldErrors?.interestRate && (
					<p className="text-xs text-destructive">
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
					<p className="text-xs text-destructive">
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

			{/* Opening balance */}
			<div className="space-y-3 rounded-lg border border-border p-4 dark:border-border/40">
				<div>
					<p className="text-sm font-medium text-foreground dark:text-card-foreground">Åpningssaldo (valgfritt)</p>
					<p className="mt-0.5 text-xs text-foreground/60 dark:text-foreground/50">Fyll ut hvis lånet eksisterte før du begynte å bruke appen</p>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="openingBalance">Gjeldende restgjeld (NOK)</Label>
					<Input
						id="openingBalance"
						name="openingBalance"
						type="text"
						inputMode="decimal"
						pattern="[0-9]*[.,]?[0-9]*"
						placeholder="0.00"
						defaultValue={defaultOpeningBalanceNOK}
						className="h-9"
					/>
					{state?.fieldErrors?.openingBalance && (
						<p className="text-xs text-destructive">{state.fieldErrors.openingBalance[0]}</p>
					)}
				</div>
				<CalendarField
					name="openingBalanceDate"
					label="Per dato"
					defaultDate={defaultOpeningBalanceDate}
					error={state?.fieldErrors?.openingBalanceDate?.[0]}
				/>
			</div>

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
					className="bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
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
