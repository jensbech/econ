"use client";

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

interface DeleteConfirmButtonProps {
	deleteAction: () => Promise<void>;
	/** Button label, e.g. "Slett utgift" */
	label: string;
	/** Dialog title, e.g. "Slett utgift" */
	title: string;
	/** Dialog body text */
	description: string;
}

/** Generic confirmation dialog + delete trigger button */
export function DeleteConfirmButton({
	deleteAction,
	label,
	title,
	description,
}: DeleteConfirmButtonProps) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="destructive"
					size="sm"
					className="gap-2 bg-red-600 hover:bg-red-700"
				>
					<Trash2 className="h-4 w-4" />
					{label}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Avbryt</AlertDialogCancel>
					<form action={deleteAction}>
						<AlertDialogAction
							type="submit"
							className="bg-red-600 hover:bg-red-700"
						>
							Slett
						</AlertDialogAction>
					</form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
