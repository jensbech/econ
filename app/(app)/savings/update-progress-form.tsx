"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProgressFormState } from "./actions";

interface UpdateProgressFormProps {
	action: (
		state: ProgressFormState,
		formData: FormData,
	) => Promise<ProgressFormState>;
	currentNOK: string;
}

export function UpdateProgressForm({
	action,
	currentNOK,
}: UpdateProgressFormProps) {
	const [state, formAction, pending] = useActionState(action, null);
	const [mode, setMode] = useState<"set" | "increment">("increment");

	return (
		<form action={formAction} className="space-y-3">
			{state?.error && <p className="text-xs text-red-600">{state.error}</p>}

			{/* Mode toggle */}
			<div className="flex rounded-lg border border-gray-200 p-0.5 text-xs dark:border-gray-700">
				<button
					type="button"
					onClick={() => setMode("increment")}
					className={`flex-1 rounded-md px-2 py-1.5 font-medium transition-colors ${
						mode === "increment"
							? "bg-indigo-600 text-white"
							: "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					}`}
				>
					Legg til
				</button>
				<button
					type="button"
					onClick={() => setMode("set")}
					className={`flex-1 rounded-md px-2 py-1.5 font-medium transition-colors ${
						mode === "set"
							? "bg-indigo-600 text-white"
							: "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
					}`}
				>
					Sett til
				</button>
			</div>

			<input type="hidden" name="mode" value={mode} />

			<div className="space-y-1">
				<Label htmlFor={`amount-${mode}`} className="text-xs">
					{mode === "increment"
						? "Beløp å legge til (NOK)"
						: `Nytt beløp (NOK) — nå: ${currentNOK}`}
				</Label>
				<div className="flex gap-2">
					<Input
						id={`amount-${mode}`}
						name="amount"
						type="number"
						step="0.01"
						min="0"
						placeholder="0.00"
						className="h-8 text-sm"
					/>
					<Button
						type="submit"
						disabled={pending}
						size="sm"
						className="bg-indigo-600 hover:bg-indigo-700"
					>
						{pending ? "..." : "OK"}
					</Button>
				</div>
				{state?.fieldErrors?.amount && (
					<p className="text-xs text-red-600">{state.fieldErrors.amount[0]}</p>
				)}
			</div>
		</form>
	);
}
