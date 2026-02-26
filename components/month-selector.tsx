"use client";

import { addMonths, format, parseISO, subMonths } from "date-fns";
import { nb } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

interface MonthSelectorProps {
	initialMonth: string;
}

export function MonthSelector({ initialMonth }: MonthSelectorProps) {
	const router = useRouter();
	const [, startTransition] = useTransition();
	const [isOpen, setIsOpen] = useState(false);

	const selectedMonth = parseISO(`${initialMonth}-01`);
	const monthLabel = format(selectedMonth, "MMMM", { locale: nb });
	const monthLabelDisplay =
		monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
	const year = format(selectedMonth, "yyyy");

	function setMonth(month: string) {
		const secure = window.location.protocol === "https:" ? "; Secure" : "";
		document.cookie = `selectedMonth=${month}; path=/; max-age=7776000; SameSite=Lax${secure}`;
		setIsOpen(false);
		startTransition(() => {
			router.refresh();
		});
	}

	const prevMonth = format(subMonths(selectedMonth, 1), "yyyy-MM");
	const nextMonth = format(addMonths(selectedMonth, 1), "yyyy-MM");

	return (
		<>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="gap-1.5 text-sm md:hidden"
					>
						<span className="text-foreground/80">
							{monthLabelDisplay}
						</span>
						<ChevronDown className="h-4 w-4 text-foreground/60" />
					</Button>
				</PopoverTrigger>

				<PopoverContent align="start" className="w-64 p-0">
					<div className="space-y-2 p-4">
						<div className="flex items-center justify-between gap-2">
							<button
								type="button"
								onClick={() => setMonth(prevMonth)}
								className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary active:scale-95"
								aria-label="Forrige måned"
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
							<div className="flex-1 text-center">
								<h3 className="text-sm font-semibold text-foreground">
									{monthLabelDisplay}
								</h3>
								<p className="text-xs text-foreground/60">
									{year}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setMonth(nextMonth)}
								className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary active:scale-95"
								aria-label="Neste måned"
							>
								<ChevronRight className="h-4 w-4" />
							</button>
						</div>

						<div className="grid grid-cols-3 gap-2">
							{Array.from({ length: 12 }).map((_, i) => {
								const monthDate = addMonths(
									parseISO(`${year}-01-01`),
									i
								);
								const monthStr = format(monthDate, "yyyy-MM");
								const monthAbbr = format(monthDate, "MMM", {
									locale: nb,
								});
								const isSelected = monthStr === initialMonth;

								return (
									<button
										key={monthStr}
										type="button"
										onClick={() => setMonth(monthStr)}
										className={`rounded-lg py-2 text-xs font-medium transition-colors ${
											isSelected
												? "bg-primary text-primary-foreground"
												: "text-foreground/70 hover:bg-primary/10"
										}`}
									>
										{monthAbbr}
									</button>
								);
							})}
						</div>
					</div>
				</PopoverContent>
			</Popover>

			<div className="hidden items-center gap-2 md:flex">
				<Button
					variant="ghost"
					size="icon"
					onClick={() =>
						setMonth(
							format(subMonths(selectedMonth, 1), "yyyy-MM")
						)
					}
					className="h-8 w-8"
					aria-label="Forrige måned"
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<span className="min-w-[130px] text-center text-sm font-semibold text-foreground">
					{format(selectedMonth, "MMMM yyyy", { locale: nb })}
				</span>
				<Button
					variant="ghost"
					size="icon"
					onClick={() =>
						setMonth(
							format(addMonths(selectedMonth, 1), "yyyy-MM")
						)
					}
					className="h-8 w-8"
					aria-label="Neste måned"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</>
	);
}
