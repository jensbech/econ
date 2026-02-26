"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useActionState, useMemo, useRef, useState } from "react";
import {
	CalendarField,
	FormError,
	SELECT_CLASS_NAME,
} from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ExpenseFormState } from "./actions";

interface Category {
	id: string;
	name: string;
}

interface AccountOption {
	id: string;
	name: string;
}

interface LoanOption {
	id: string;
	name: string;
}

interface ExpenseFormProps {
	action: (
		state: ExpenseFormState,
		formData: FormData,
	) => Promise<ExpenseFormState>;
	defaultDate?: Date;
	defaultAmountNOK?: string;
	defaultCategoryId?: string;
	defaultNotes?: string;
	defaultAccountId?: string;
	defaultLoanId?: string;
	defaultInterestNOK?: string;
	defaultPrincipalNOK?: string;
	categories: Category[];
	accounts?: AccountOption[];
	loans?: LoanOption[];
	submitLabel?: string;
	cancelHref?: string;
}

export function ExpenseForm({
	action,
	defaultDate,
	defaultAmountNOK,
	defaultCategoryId,
	defaultNotes,
	defaultAccountId,
	defaultLoanId,
	defaultInterestNOK,
	defaultPrincipalNOK,
	categories,
	accounts = [],
	loans = [],
	submitLabel = "Lagre",
	cancelHref = "/expenses",
}: ExpenseFormProps) {
	const [state, formAction, pending] = useActionState(action, null);
	const [selectedCategoryId, setSelectedCategoryId] = useState(
		defaultCategoryId ?? "",
	);
	const formRef = useRef<HTMLFormElement>(null);
	const forceInputRef = useRef<HTMLInputElement>(null);

	const selectedCategoryName = useMemo(() => {
		const cat = categories.find((c) => c.id === selectedCategoryId);
		return cat?.name ?? "";
	}, [categories, selectedCategoryId]);

	const isLoanCategory = selectedCategoryName === "Lån";

	return (
		<form ref={formRef} action={formAction} className="space-y-5">
			<input type="hidden" name="force" ref={forceInputRef} defaultValue="" />
			<FormError error={state?.error} />

			{state?.duplicateWarning && (
				<div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
					<AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
					<div className="flex-1">
						<p className="font-medium">Mulig duplikat</p>
						<p className="mt-0.5">{state.warning}</p>
						<div className="mt-3 flex gap-2">
							<Button
								type="button"
								size="sm"
								className="bg-amber-600 hover:bg-amber-700 text-white"
								onClick={() => {
									if (forceInputRef.current) forceInputRef.current.value = "true";
									formRef.current?.requestSubmit();
								}}
							>
								Lagre likevel
							</Button>
							<Button type="button" size="sm" variant="outline" asChild>
								<a href={cancelHref}>Avbryt</a>
							</Button>
						</div>
					</div>
				</div>
			)}

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
					type="text"
					inputMode="decimal"
					pattern="[0-9]*[.,]?[0-9]*"
					placeholder="0.00"
					defaultValue={defaultAmountNOK}
					className="h-9"
					// biome-ignore lint/a11y/noAutofocus: first editable field should auto-focus
					autoFocus={!defaultAmountNOK}
				/>
				{state?.fieldErrors?.amount && (
					<p className="text-xs text-red-600 dark:text-red-400">
						{state.fieldErrors.amount[0]}
					</p>
				)}
			</div>

			{/* Category */}
			<div className="space-y-1.5">
				<Label htmlFor="categoryId">Kategori</Label>
				<select
					id="categoryId"
					name="categoryId"
					value={selectedCategoryId}
					onChange={(e) => setSelectedCategoryId(e.target.value)}
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


			{/* Loan selector + interest/principal split — shown when category = "Lån" */}
			{isLoanCategory && loans.length > 0 && (
				<div className="space-y-4 rounded-lg border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
					<div className="space-y-1.5">
						<Label htmlFor="loanId">Hvilket lån?</Label>
						<select
							id="loanId"
							name="loanId"
							defaultValue={defaultLoanId ?? (loans.length === 1 ? loans[0].id : "")}
							className={SELECT_CLASS_NAME}
						>
							<option value="">Ingen</option>
							{loans.map((l) => (
								<option key={l.id} value={l.id}>
									{l.name}
								</option>
							))}
						</select>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="interestAmount">Renter (NOK)</Label>
							<Input
								id="interestAmount"
								name="interestAmount"
								type="text"
								inputMode="decimal"
								pattern="[0-9]*[.,]?[0-9]*"
								placeholder="0.00"
								defaultValue={defaultInterestNOK}
								className="h-9"
							/>
							{state?.fieldErrors?.interestAmount && (
								<p className="text-xs text-red-600 dark:text-red-400">
									{state.fieldErrors.interestAmount[0]}
								</p>
							)}
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="principalAmount">Avdrag (NOK)</Label>
							<Input
								id="principalAmount"
								name="principalAmount"
								type="text"
								inputMode="decimal"
								pattern="[0-9]*[.,]?[0-9]*"
								placeholder="0.00"
								defaultValue={defaultPrincipalNOK}
								className="h-9"
							/>
							{state?.fieldErrors?.principalAmount && (
								<p className="text-xs text-red-600 dark:text-red-400">
									{state.fieldErrors.principalAmount[0]}
								</p>
							)}
						</div>
					</div>
					<p className="text-xs text-amber-700 dark:text-amber-400">
						Renter + avdrag bør tilsvare totalbeløpet.
					</p>
				</div>
			)}

			{/* Account */}
			{accounts.length > 0 && (
				<div className="space-y-1.5">
					<Label htmlFor="accountId">Konto</Label>
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

			{/* Notes */}
			<div className="space-y-1.5">
				<Label htmlFor="notes">Notater (valgfritt)</Label>
				<Textarea
					id="notes"
					name="notes"
					placeholder="Legg til notater..."
					defaultValue={defaultNotes}
					rows={3}
					className="resize-y"
				/>
			</div>

			<div className="flex gap-3 pt-1">
				<Button
					type="submit"
					disabled={pending}
					className="gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
				>
					{pending && <Loader2 className="h-4 w-4 animate-spin" />}
					{pending ? "Lagrer..." : submitLabel}
				</Button>
				<Button type="button" variant="outline" asChild>
					<a href={cancelHref}>Avbryt</a>
				</Button>
			</div>
		</form>
	);
}
