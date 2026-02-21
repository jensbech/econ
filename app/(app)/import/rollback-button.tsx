"use client";

import { useTransition } from "react";
import { toast } from "sonner";
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

interface RollbackButtonProps {
	action: () => Promise<void>;
	filename: string;
}

export function RollbackButton({ action, filename }: RollbackButtonProps) {
	const [isPending, startTransition] = useTransition();

	function handleRollback() {
		startTransition(async () => {
			await action();
			toast.success(`Import "${filename}" ble angret`);
		});
	}

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<button
					type="button"
					disabled={isPending}
					className="text-xs text-red-600 hover:text-red-700 hover:underline disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
				>
					{isPending ? "Angrer..." : "Angre import"}
				</button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Angre import</AlertDialogTitle>
					<AlertDialogDescription>
						Er du sikker på at du vil angre importen av &laquo;{filename}
						&raquo;? Alle utgifter fra denne importen vil bli slettet.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Avbryt</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleRollback}
						className="bg-red-600 hover:bg-red-700"
					>
						Angre import
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
