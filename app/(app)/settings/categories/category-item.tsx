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
		<div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
						className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
						onClick={cancelEdit}
					>
						<X className="h-4 w-4" />
					</Button>
				</form>
			) : (
				<>
					<span className="flex-1 text-sm text-gray-900 dark:text-white">
						{name}
					</span>
					{isDefault && (
						<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
							standard
						</span>
					)}
					<Button
						type="button"
						size="sm"
						variant="ghost"
						className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
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
								className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
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
