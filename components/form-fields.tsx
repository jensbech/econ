"use client";

import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

/** Shared Tailwind className for native <select> elements */
export const SELECT_CLASS_NAME =
	"h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

/** Top-level form error banner */
export function FormError({ error }: { error?: string | null }) {
	if (!error) return null;
	return (
		<div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
			{error}
		</div>
	);
}

interface CalendarFieldProps {
	/** Form field name submitted in the hidden input */
	name: string;
	/** Label text */
	label: string;
	/** Initial date. When undefined and defaultToToday is false, nothing is selected. */
	defaultDate?: Date;
	/** When true, defaults to today if no defaultDate is given */
	defaultToToday?: boolean;
	/** Placeholder text shown when no date is selected */
	placeholder?: string;
	/** Field-level error message */
	error?: string;
	/**
	 * When true, renders a "Fjern" button to clear the selection and wraps the
	 * trigger in a flex row. Suitable for optional date fields.
	 */
	clearable?: boolean;
	/** Override className for the popover trigger button */
	triggerClassName?: string;
}

/**
 * A date picker built on shadcn Calendar + Popover.
 * Renders a label, hidden form input, and (optionally) a clear button.
 */
export function CalendarField({
	name,
	label,
	defaultDate,
	defaultToToday = false,
	placeholder = "Velg dato",
	error,
	clearable = false,
	triggerClassName,
}: CalendarFieldProps) {
	const resolved = defaultDate ?? (defaultToToday ? new Date() : undefined);
	const [date, setDate] = useState<Date | undefined>(resolved);
	const [open, setOpen] = useState(false);

	const triggerClass =
		triggerClassName ??
		(clearable
			? "flex-1 justify-start text-left font-normal"
			: "w-full justify-start text-left font-normal");

	const trigger = (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button type="button" variant="outline" className={triggerClass}>
					<CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
					{date ? format(date, "d. MMMM yyyy", { locale: nb }) : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={date}
					onSelect={(d) => {
						setDate(d);
						setOpen(false);
					}}
					locale={nb}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	);

	return (
		<div className="space-y-1.5">
			<Label>{label}</Label>
			<input
				type="hidden"
				name={name}
				value={date ? format(date, "yyyy-MM-dd") : ""}
			/>
			{clearable ? (
				<div className="flex gap-2">
					{trigger}
					{date && (
						<Button
							type="button"
							variant="outline"
							className="px-3"
							onClick={() => setDate(undefined)}
						>
							Fjern
						</Button>
					)}
				</div>
			) : (
				trigger
			)}
			{error && <p className="text-xs text-red-600">{error}</p>}
		</div>
	);
}
