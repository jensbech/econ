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
							<CalendarIcon className="mr-2 h-4 w-4 text-foreground/50" />
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
				<Label htmlFor="pay-amount">Totalbeløp (NOK)</Label>
				<Input
					id="pay-amount"
					name="amount"
					type="text"
					inputMode="decimal"
					pattern="[0-9]*[.,]?[0-9]*"
					placeholder="0.00"
					className="h-9"
				/>
				{state?.fieldErrors?.amount && (
					<p className="text-xs text-red-600">{state.fieldErrors.amount[0]}</p>
				)}
			</div>

			{/* Interest/Principal split */}
			<div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-900/10">
				<p className="text-xs font-medium text-amber-700 dark:text-amber-400">
					Valgfri fordeling renter/avdrag
				</p>
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<Label htmlFor="pay-interest">Renter (NOK)</Label>
						<Input
							id="pay-interest"
							name="interestAmount"
							type="text"
							inputMode="decimal"
							pattern="[0-9]*[.,]?[0-9]*"
							placeholder="0.00"
							className="h-9"
						/>
						{state?.fieldErrors?.interestAmount && (
							<p className="text-xs text-red-600">
								{state.fieldErrors.interestAmount[0]}
							</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="pay-principal">Avdrag (NOK)</Label>
						<Input
							id="pay-principal"
							name="principalAmount"
							type="text"
							inputMode="decimal"
							pattern="[0-9]*[.,]?[0-9]*"
							placeholder="0.00"
							className="h-9"
						/>
						{state?.fieldErrors?.principalAmount && (
							<p className="text-xs text-red-600">
								{state.fieldErrors.principalAmount[0]}
							</p>
						)}
					</div>
				</div>
			</div>

			<Button
				type="submit"
				disabled={pending}
				className="w-full bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
			>
				{pending ? "Registrerer..." : "Registrer betaling"}
			</Button>
		</form>
	);
}
