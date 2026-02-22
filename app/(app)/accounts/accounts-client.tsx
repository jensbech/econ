"use client";

import { Lock, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountIcon, ACCOUNT_ICONS } from "@/components/account-icon";
import { createAccount, deleteAccount, updateAccount } from "./actions";

interface AccountRow {
	id: string;
	name: string;
	accountNumber: string | null;
	type: string;
	kind: string;
	icon: string;
	userId: string;
	creatorName: string | null;
	creatorEmail: string | null;
}

interface AccountsClientProps {
	accounts: AccountRow[];
	currentUserId: string;
}

function IconPicker({
	value,
	onChange,
}: {
	value: string;
	onChange: (icon: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [open]);

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
			>
				<AccountIcon icon={value} className="h-4 w-4" />
				<span>{ACCOUNT_ICONS[value]?.label ?? "Velg ikon"}</span>
			</button>
			{open && (
				<div className="absolute left-0 top-full z-50 mt-1 grid max-h-64 w-72 grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
					{Object.entries(ACCOUNT_ICONS).map(([key, { label }]) => (
						<button
							key={key}
							type="button"
							title={label}
							onClick={() => {
								onChange(key);
								setOpen(false);
							}}
							className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
								value === key
									? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
									: "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
							}`}
						>
							<AccountIcon icon={key} className="h-4 w-4" />
						</button>
					))}
				</div>
			)}
		</div>
	);
}

export function AccountsClient({
	accounts,
	currentUserId,
}: AccountsClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [showNewForm, setShowNewForm] = useState(false);
	const [newName, setNewName] = useState("");
	const [newType, setNewType] = useState<"public" | "private">("public");
	const [newKind, setNewKind] = useState("checking");
	const [newIcon, setNewIcon] = useState("wallet");
	const [newAccountNumber, setNewAccountNumber] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editKind, setEditKind] = useState("checking");
	const [editIcon, setEditIcon] = useState("wallet");
	const [editAccountNumber, setEditAccountNumber] = useState("");

	function handleCreate() {
		if (!newName.trim()) return;
		startTransition(async () => {
			await createAccount(newName.trim(), newType, newIcon, newAccountNumber || undefined, newKind);
			toast.success("Konto opprettet");
			setNewName("");
			setNewKind("checking");
			setNewIcon("wallet");
			setNewAccountNumber("");
			setShowNewForm(false);
			router.refresh();
		});
	}

	function startEdit(account: AccountRow) {
		setEditingId(account.id);
		setEditName(account.name);
		setEditKind(account.kind);
		setEditIcon(account.icon);
		setEditAccountNumber(account.accountNumber ?? "");
	}

	function handleUpdate(id: string) {
		if (!editName.trim()) return;
		startTransition(async () => {
			await updateAccount(id, editName.trim(), editIcon, editAccountNumber || null, editKind);
			toast.success("Konto oppdatert");
			setEditingId(null);
			router.refresh();
		});
	}

	function handleDelete(id: string) {
		startTransition(async () => {
			await deleteAccount(id);
			toast.success("Konto slettet");
			router.refresh();
		});
	}

	return (
		<div className="space-y-4 max-w-2xl">
			{/* Account list */}
			{accounts.length === 0 ? (
				<div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center dark:border-gray-700 dark:bg-gray-800">
					<p className="text-sm text-gray-500 dark:text-gray-400">
						Ingen kontoer enn&aring;.
					</p>
				</div>
			) : (
				<div className="rounded-xl border border-gray-200 bg-white overflow-hidden dark:border-gray-700 dark:bg-gray-800">
					<ul className="divide-y divide-gray-100 dark:divide-gray-700">
						{accounts.map((account) => {
							const isOwner = account.userId === currentUserId;
							const isEditing = editingId === account.id;

							return (
								<li
									key={account.id}
									className="flex items-center gap-3 px-5 py-4"
								>
									<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
										{account.type === "private" ? (
											<Lock className="h-4 w-4 text-purple-500 dark:text-purple-400" />
										) : (
											<AccountIcon
												icon={account.icon}
												className="h-4 w-4 text-gray-600 dark:text-gray-300"
											/>
										)}
									</div>

									<div className="flex-1 min-w-0">
										{isEditing ? (
											<div className="flex items-center gap-2 flex-wrap">
												<IconPicker
													value={editIcon}
													onChange={setEditIcon}
												/>
												<Input
													value={editName}
													onChange={(e) =>
														setEditName(e.target.value)
													}
													onKeyDown={(e) => {
														if (e.key === "Enter")
															handleUpdate(account.id);
														if (e.key === "Escape")
															setEditingId(null);
													}}
													className="h-8 max-w-xs"
													placeholder="Kontonavn"
													// biome-ignore lint/a11y/noAutofocus: intentional focus for inline edit
													autoFocus
												/>
												<Input
													value={editAccountNumber}
													onChange={(e) =>
														setEditAccountNumber(e.target.value)
													}
													onKeyDown={(e) => {
														if (e.key === "Enter")
															handleUpdate(account.id);
														if (e.key === "Escape")
															setEditingId(null);
													}}
													className="h-8 max-w-[160px]"
													placeholder="Kontonummer"
												/>
												<select
													value={editKind}
													onChange={(e) =>
														setEditKind(e.target.value)
													}
													onKeyDown={(e) => {
														if (e.key === "Enter")
															handleUpdate(account.id);
														if (e.key === "Escape")
															setEditingId(null);
													}}
													className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
												>
													<option value="checking">Brukskonto</option>
													<option value="savings">Sparekonto</option>
													<option value="credit">Kredittkort</option>
													<option value="investment">Investering</option>
												</select>
												<Button
													size="sm"
													onClick={() =>
														handleUpdate(account.id)
													}
													disabled={isPending}
													className="h-8 bg-indigo-600 hover:bg-indigo-700"
												>
													Lagre
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => setEditingId(null)}
													className="h-8"
												>
													Avbryt
												</Button>
											</div>
										) : (
											<div>
												<div className="flex items-center gap-2">
													<span className="font-medium text-sm text-gray-900 dark:text-white">
														{account.name}
													</span>
													<Badge
														variant="secondary"
														className={
															account.type === "private"
																? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
																: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
														}
													>
														{account.type === "private"
															? "Privat"
															: "Felles"}
													</Badge>
													<span className="text-xs text-gray-400">
														{account.creatorName ??
															account.creatorEmail ??
															""}
													</span>
												</div>
												{account.accountNumber && (
													<span className="text-xs text-gray-400 dark:text-gray-500">
														Kontonr: {account.accountNumber}
													</span>
												)}
											</div>
										)}
									</div>

									{isOwner && !isEditing && (
										<div className="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												onClick={() => startEdit(account)}
											>
												<Pencil className="h-4 w-4 text-gray-500" />
											</Button>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8"
													>
														<Trash2 className="h-4 w-4 text-red-400" />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															Slett konto
														</AlertDialogTitle>
														<AlertDialogDescription>
															Er du sikker p&aring; at du
															vil slette &laquo;
															{account.name}&raquo;?
															Eksisterende transaksjoner
															vil ikke bli slettet.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>
															Avbryt
														</AlertDialogCancel>
														<AlertDialogAction
															onClick={() =>
																handleDelete(account.id)
															}
															className="bg-red-600 hover:bg-red-700"
														>
															Slett
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
									)}
								</li>
							);
						})}
					</ul>
				</div>
			)}

			{/* New account form */}
			{showNewForm ? (
				<div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 dark:border-gray-700 dark:bg-gray-800">
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
						Ny konto
					</h3>
					<div className="space-y-1.5">
						<Label htmlFor="newName">Navn</Label>
						<Input
							id="newName"
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							placeholder="Kontonavn..."
							onKeyDown={(e) => {
								if (e.key === "Enter") handleCreate();
								if (e.key === "Escape") setShowNewForm(false);
							}}
							className="max-w-xs"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="newAccountNumber">Kontonummer</Label>
						<Input
							id="newAccountNumber"
							value={newAccountNumber}
							onChange={(e) => setNewAccountNumber(e.target.value)}
							placeholder="F.eks. 1234.56.78901"
							className="max-w-xs"
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Ikon</Label>
						<IconPicker value={newIcon} onChange={setNewIcon} />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="newType">Type</Label>
						<select
							id="newType"
							value={newType}
							onChange={(e) =>
								setNewType(e.target.value as "public" | "private")
							}
							className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
						>
							<option value="public">
								Felles (synlig for alle)
							</option>
							<option value="private">
								Privat (kun synlig for deg)
							</option>
						</select>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="newKind">Kontotype</Label>
						<select
							id="newKind"
							value={newKind}
							onChange={(e) => setNewKind(e.target.value)}
							className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
						>
							<option value="checking">Brukskonto</option>
							<option value="savings">Sparekonto</option>
							<option value="credit">Kredittkort</option>
							<option value="investment">Investering</option>
						</select>
					</div>
					<div className="flex gap-2">
						<Button
							onClick={handleCreate}
							disabled={isPending || !newName.trim()}
							className="bg-indigo-600 hover:bg-indigo-700"
						>
							Opprett konto
						</Button>
						<Button
							variant="outline"
							onClick={() => {
								setShowNewForm(false);
								setNewName("");
								setNewKind("checking");
								setNewIcon("wallet");
								setNewAccountNumber("");
							}}
						>
							Avbryt
						</Button>
					</div>
				</div>
			) : (
				<Button
					onClick={() => setShowNewForm(true)}
					className="gap-2 bg-indigo-600 hover:bg-indigo-700"
				>
					<Plus className="h-4 w-4" />
					Ny konto
				</Button>
			)}
		</div>
	);
}
