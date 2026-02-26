"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { deleteCategory, renameCategory } from "./actions";

interface CategoryItemProps {
	id: string;
	name: string;
	isDefault: boolean;
}

export function CategoryItem({ id, name, isDefault }: CategoryItemProps) {
	const [editing, setEditing] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	function startEdit() {
		setEditing(true);
		// Focus input after render
		setTimeout(() => inputRef.current?.focus(), 0);
	}

	function cancelEdit() {
		setEditing(false);
	}

	async function handleRename(formData: FormData) {
		await renameCategory(formData);
		setEditing(false);
	}

	return (
		<div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 dark:border-border/40 dark:bg-card">
			{editing ? (
				<form action={handleRename} className="flex flex-1 items-center gap-2">
					<input type="hidden" name="id" value={id} />
					<Input
						ref={inputRef}
						name="name"
						defaultValue={name}
						className="h-8 flex-1"
						onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
					/>
					<Button
						type="submit"
						size="sm"
						variant="ghost"
						className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
					>
						<Check className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						className="h-8 w-8 p-0 text-foreground/50 hover:text-foreground/70"
						onClick={cancelEdit}
					>
						<X className="h-4 w-4" />
					</Button>
				</form>
			) : (
				<>
					<span className="flex-1 text-sm text-foreground dark:text-card-foreground">
						{name}
					</span>
					{isDefault && (
						<span className="rounded-full bg-primary/8 px-2 py-0.5 text-xs text-foreground/60 dark:bg-card dark:text-foreground/50">
							standard
						</span>
					)}
					<Button
						type="button"
						size="sm"
						variant="ghost"
						className="h-8 w-8 p-0 text-foreground/50 hover:text-foreground/70"
						onClick={startEdit}
					>
						<Pencil className="h-4 w-4" />
					</Button>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								className="h-8 w-8 p-0 text-foreground/50 hover:text-red-600"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Slett kategori</AlertDialogTitle>
								<AlertDialogDescription>
									Er du sikker på at du vil slette &ldquo;{name}&rdquo;? Denne
									handlingen kan ikke angres.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Avbryt</AlertDialogCancel>
								<form action={deleteCategory}>
									<input type="hidden" name="id" value={id} />
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
				</>
			)}
		</div>
	);
}
