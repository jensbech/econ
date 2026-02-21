"use client";

import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { PaymentFormState } from "./actions";

interface PaymentFormProps {
	action: (
		state: PaymentFormState,
		formData: FormData,
	) => Promise<PaymentFormState>;
}

export function PaymentForm({ action }: PaymentFormProps) {
	const [state, formAction, pending] = useActionState(action, null);
	const [date, setDate] = useState<Date | undefined>(new Date());
	const [calendarOpen, setCalendarOpen] = useState(false);

	return (
		<form action={formAction} className="space-y-4">
			{state?.error && (
				<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
					{state.error}
				</div>
			)}

			{/* Date */}
			<div className="space-y-1.5">
				<Label>Betalingsdato</Label>
				<input
					type="hidden"
					name="date"
					value={date ? format(date, "yyyy-MM-dd") : ""}
				/>
				<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="w-full justify-start text-left font-normal"
						>
							<CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
							{date
								? format(date, "d. MMMM yyyy", { locale: nb })
								: "Velg dato"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={date}
							onSelect={(d) => {
								setDate(d);
								setCalendarOpen(false);
							}}
							locale={nb}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
				{state?.fieldErrors?.date && (
					<p className="text-xs text-red-600">{state.fieldErrors.date[0]}</p>
				)}
			</div>

			{/* Amount */}
			<div className="space-y-1.5">
				<Label htmlFor="pay-amount">Beløp (NOK)</Label>
				<Input
					id="pay-amount"
					name="amount"
					type="number"
					step="0.01"
					min="0"
					placeholder="0.00"
					className="h-9"
				/>
				{state?.fieldErrors?.amount && (
					<p className="text-xs text-red-600">{state.fieldErrors.amount[0]}</p>
				)}
			</div>

			<Button
				type="submit"
				disabled={pending}
				className="w-full bg-indigo-600 hover:bg-indigo-700"
			>
				{pending ? "Registrerer..." : "Registrer betaling"}
			</Button>
		</form>
	);
}
