"use client";

import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatNOK } from "@/lib/format";
import type { ProgressFormState } from "./actions";
import { UpdateProgressForm } from "./update-progress-form";

interface GoalCardProps {
	goal: {
		id: string;
		name: string;
		targetOere: number;
		currentOere: number;
		targetDate: string | null;
	};
	updateAction: (
		state: ProgressFormState,
		formData: FormData,
	) => Promise<ProgressFormState>;
	deleteAction: () => Promise<void>;
}

export function GoalCard({
	goal,
	updateAction,
	deleteAction,
}: GoalCardProps) {
	const pct = Math.min(
		100,
		goal.targetOere > 0
			? Math.round((goal.currentOere / goal.targetOere) * 100)
			: 0,
	);
	const remaining = Math.max(0, goal.targetOere - goal.currentOere);

	return (
		<div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
			{/* Header */}
			<div className="mb-4 flex items-start justify-between gap-2">
				<div className="min-w-0">
					<h3 className="truncate font-semibold text-gray-900 dark:text-white">
						{goal.name}
					</h3>
					{goal.targetDate && (
						<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
							Mål:{" "}
							{format(parseISO(goal.targetDate), "d. MMMM yyyy", {
								locale: nb,
							})}
						</p>
					)}
				</div>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 flex-shrink-0 text-gray-400 hover:text-red-600"
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Slett sparemål?</AlertDialogTitle>
							<AlertDialogDescription>
								Er du sikker på at du vil slette «{goal.name}»? Dette kan ikke
								angres.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Avbryt</AlertDialogCancel>
							<AlertDialogAction
								onClick={async () => {
									await deleteAction();
								}}
								className="bg-red-600 hover:bg-red-700"
							>
								Slett
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>

			{/* Progress stats */}
			<div className="mb-3">
				<div className="flex items-baseline justify-between">
					<span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
						{formatNOK(goal.currentOere)}
					</span>
					<span className="text-sm text-gray-500 dark:text-gray-400">
						av {formatNOK(goal.targetOere)}
					</span>
				</div>
				<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
					{remaining > 0
						? `${formatNOK(remaining)} gjenstår`
						: "Målet er nådd!"}
				</p>
			</div>

			{/* Progress bar */}
			<div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
				<div
					className={`h-full rounded-full transition-all ${
						pct >= 100 ? "bg-green-500" : "bg-indigo-500"
					}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
				{pct}% fullført
			</p>

			{/* Update progress */}
			<div className="border-t border-gray-100 pt-4 dark:border-gray-800">
				<UpdateProgressForm
					action={updateAction}
					currentNOK={(goal.currentOere / 100).toFixed(2)}
				/>
			</div>
		</div>
	);
}
