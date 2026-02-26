"use client";

import { addMonths, format, parseISO, subMonths } from "date-fns";
import { nb } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface MonthSelectorProps {
	initialMonth: string; // "yyyy-MM"
}

export function MonthSelector({ initialMonth }: MonthSelectorProps) {
	const router = useRouter();
	const [, startTransition] = useTransition();

	const selectedMonth = parseISO(`${initialMonth}-01`);
	const prevMonth = format(subMonths(selectedMonth, 1), "yyyy-MM");
	const nextMonth = format(addMonths(selectedMonth, 1), "yyyy-MM");
	const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: nb });
	const monthLabelDisplay =
		monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

	function setMonth(month: string) {
		const secure = window.location.protocol === "https:" ? "; Secure" : "";
		document.cookie = `selectedMonth=${month}; path=/; max-age=7776000; SameSite=Lax${secure}`;
		startTransition(() => {
			router.refresh();
		});
	}

	const btnCls =
		"flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white";

	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={() => setMonth(prevMonth)}
				className={btnCls}
				aria-label="Forrige måned"
			>
				<ChevronLeft className="h-3.5 w-3.5" />
			</button>
			<span className="min-w-[130px] text-center text-sm font-semibold text-gray-900 dark:text-white">
				{monthLabelDisplay}
			</span>
			<button
				type="button"
				onClick={() => setMonth(nextMonth)}
				className={btnCls}
				aria-label="Neste måned"
			>
				<ChevronRight className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
