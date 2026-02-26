"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useActionState, useRef } from "react";
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

interface AccountOption {
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
	defaultAccountId?: string;
	categories: Category[];
	accounts?: AccountOption[];
	submitLabel?: string;
	cancelHref?: string;
}

export function IncomeForm({
	action,
	defaultDate,
	defaultAmountNOK,
	defaultSource,
	defaultType,
	defaultCategoryId,
	defaultAccountId,
	categories,
	accounts = [],
	submitLabel = "Lagre",
	cancelHref = "/income",
}: IncomeFormProps) {
	const [state, formAction, pending] = useActionState(action, null);
	const formRef = useRef<HTMLFormElement>(null);
	const forceInputRef = useRef<HTMLInputElement>(null);

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
								className="bg-amber-600 hover:bg-amber-700 text-card-foreground"
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
				<p className="text-xs text-foreground/50 dark:text-foreground/60">
					Navn på arbeidsgiver, klient, eller inntektskilde
				</p>
				{state?.fieldErrors?.source && (
					<p className="text-xs text-red-600 dark:text-red-400">
						{state.fieldErrors.source[0]}
					</p>
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
					<option value="salary">Lønn (fast, forutsigbar)</option>
					<option value="variable">Variabel inntekt (uforutsigbar)</option>
				</select>
				{state?.fieldErrors?.type && (
					<p className="text-xs text-red-600 dark:text-red-400">
						{state.fieldErrors.type[0]}
					</p>
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

			<div className="flex gap-3 pt-1">
				<Button
					type="submit"
					disabled={pending}
					className="gap-2 bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
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
