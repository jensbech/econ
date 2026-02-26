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
import { formatNOK } from "@/lib/format";
import { createAccount, deleteAccount, updateAccount } from "./actions";

interface AccountRow {
	id: string;
	name: string;
	accountNumber: string | null;
	type: string;
	kind: string;
	icon: string;
	userId: string;
	openingBalanceOere: number | null;
	openingBalanceDate: string | null;
	creatorName: string | null;
	creatorEmail: string | null;
}

interface AccountsClientProps {
	accounts: AccountRow[];
	currentUserId: string;
	balances: Record<string, number | null>;
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
				className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm text-foreground hover:bg-background dark:border-border/40 dark:bg-card dark:text-card-foreground dark:hover:bg-card"
			>
				<AccountIcon icon={value} className="h-4 w-4" />
				<span>{ACCOUNT_ICONS[value]?.label ?? "Velg ikon"}</span>
			</button>
			{open && (
				<div className="absolute left-0 top-full z-50 mt-1 grid max-h-64 w-72 grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-border bg-card p-2 shadow-lg dark:border-border/40 dark:bg-card">
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
									? "bg-card text-card-foreground dark:bg-card dark:text-foreground"
									: "text-foreground/70 hover:bg-primary/8 dark:text-foreground/50 dark:hover:bg-gray-700"
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

const ACCOUNT_NUMBER_RE = /^\d{4}\.\d{2}\.\d{5}$/;

function accountNumberError(value: string): string | null {
	if (!value.trim()) return null;
	return ACCOUNT_NUMBER_RE.test(value.trim()) ? null : "Format: XXXX.XX.XXXXX";
}

function openingBalanceError(value: string): string | null {
	if (!value.trim()) return null;
	return Number.isNaN(Number(value.replace(",", "."))) ? "Ugyldig beløp" : null;
}

export function AccountsClient({
	accounts,
	currentUserId,
	balances,
}: AccountsClientProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [showNewForm, setShowNewForm] = useState(false);
	const [newName, setNewName] = useState("");
	const [newType, setNewType] = useState<"public" | "private">("public");
	const [newKind, setNewKind] = useState("checking");
	const [newIcon, setNewIcon] = useState("wallet");
	const [newAccountNumber, setNewAccountNumber] = useState("");
	const [newOpeningBalance, setNewOpeningBalance] = useState("");
	const [newOpeningBalanceDate, setNewOpeningBalanceDate] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editKind, setEditKind] = useState("checking");
	const [editIcon, setEditIcon] = useState("wallet");
	const [editAccountNumber, setEditAccountNumber] = useState("");
	const [editOpeningBalance, setEditOpeningBalance] = useState("");
	const [editOpeningBalanceDate, setEditOpeningBalanceDate] = useState("");

	const newAccountNumberErr = accountNumberError(newAccountNumber);
	const newOpeningBalanceErr = openingBalanceError(newOpeningBalance);
	const editAccountNumberErr = accountNumberError(editAccountNumber);
	const editOpeningBalanceErr = openingBalanceError(editOpeningBalance);

	const newFormValid = !newAccountNumberErr && !newOpeningBalanceErr;
	const editFormValid = !editAccountNumberErr && !editOpeningBalanceErr;

	function handleCreate() {
		if (!newName.trim() || !newFormValid) return;
		startTransition(async () => {
			const error = await createAccount(newName.trim(), newType, newIcon, newAccountNumber || undefined, newKind, newOpeningBalance || undefined, newOpeningBalanceDate || undefined);
			if (error) {
				toast.error(error);
				return;
			}
			toast.success("Konto opprettet");
			setNewName("");
			setNewKind("checking");
			setNewIcon("wallet");
			setNewAccountNumber("");
			setNewOpeningBalance("");
			setNewOpeningBalanceDate("");
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
		setEditOpeningBalance(account.openingBalanceOere != null ? String(account.openingBalanceOere / 100) : "");
		setEditOpeningBalanceDate(account.openingBalanceDate ?? "");
	}

	function handleUpdate(id: string) {
		if (!editName.trim() || !editFormValid) return;
		startTransition(async () => {
			const error = await updateAccount(id, editName.trim(), editIcon, editAccountNumber || null, editKind, editOpeningBalance || undefined, editOpeningBalanceDate || undefined);
			if (error) {
				toast.error(error);
				return;
			}
			toast.success("Konto oppdatert");
			setEditingId(null);
			router.refresh();
		});
	}

	function handleDelete(id: string) {
		startTransition(async () => {
			const error = await deleteAccount(id);
			if (error) {
				toast.error(error);
				return;
			}
			toast.success("Konto slettet");
			router.refresh();
		});
	}

	return (
		<div className="space-y-4 max-w-2xl">
			{/* Account list */}
			{accounts.length === 0 ? (
				<div className="rounded-xl border border-dashed border-border bg-card py-12 text-center dark:border-border/40 dark:bg-card">
					<p className="text-sm text-foreground/60 dark:text-foreground/50">
						Ingen kontoer enn&aring;.
					</p>
				</div>
			) : (
				<div className="rounded-xl border border-border bg-card overflow-hidden dark:border-border/40 dark:bg-card">
					<ul className="divide-y divide-gray-100 dark:divide-gray-700">
						{accounts.map((account) => {
							const isOwner = account.userId === currentUserId;
							const isEditing = editingId === account.id;

							return (
								<li
									key={account.id}
									className="flex items-center gap-3 px-5 py-4"
								>
									<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8 dark:bg-gray-700">
										{account.type === "private" ? (
											<Lock className="h-4 w-4 text-purple-500 dark:text-purple-400" />
										) : (
											<AccountIcon
												icon={account.icon}
												className="h-4 w-4 text-foreground/70 dark:text-foreground/80"
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
													className={`h-8 max-w-[160px] ${editAccountNumberErr ? "border-red-400 focus-visible:ring-red-400" : ""}`}
													placeholder="Kontonummer"
													title={editAccountNumberErr ?? undefined}
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
													className="h-8 rounded-md border border-border bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:border-border/40 dark:bg-card dark:text-card-foreground"
												>
													<option value="checking">Brukskonto</option>
													<option value="savings">Sparekonto</option>
													<option value="credit">Kredittkort</option>
													<option value="investment">Investering</option>
												</select>
												<Input
													value={editOpeningBalance}
													onChange={(e) => setEditOpeningBalance(e.target.value)}
													placeholder="Inngående saldo (NOK)"
													inputMode="decimal"
													className="h-8 max-w-[140px]"
												/>
												<Input
													type="date"
													value={editOpeningBalanceDate}
													onChange={(e) => setEditOpeningBalanceDate(e.target.value)}
													className="h-8 max-w-[160px]"
												/>
												<Button
													size="sm"
													onClick={() =>
														handleUpdate(account.id)
													}
													disabled={isPending || !editFormValid}
													className="h-8 bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
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
													<span className="font-medium text-sm text-foreground dark:text-card-foreground">
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
													<span className="text-xs text-foreground/50">
														{account.creatorName ??
															account.creatorEmail ??
															""}
													</span>
												</div>
												{account.accountNumber && (
													<span className="text-xs text-foreground/50 dark:text-foreground/60">
														Kontonr: {account.accountNumber}
													</span>
												)}
											</div>
										)}
									</div>

									{!isEditing && (
									<div className="ml-auto text-sm font-medium tabular-nums">
										{balances[account.id] != null ? (
											<span className={balances[account.id]! >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
												{formatNOK(balances[account.id]!)}
											</span>
										) : (
											<span className="text-foreground/30">—</span>
										)}
									</div>
								)}

								{isOwner && !isEditing && (
										<div className="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												onClick={() => startEdit(account)}
											>
												<Pencil className="h-4 w-4 text-foreground/60" />
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
				<div className="rounded-xl border border-border bg-card p-5 space-y-4 dark:border-border/40 dark:bg-card">
					<h3 className="text-sm font-semibold text-foreground dark:text-card-foreground">
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
							className={`max-w-xs ${newAccountNumberErr ? "border-red-400 focus-visible:ring-red-400" : ""}`}
						/>
						{newAccountNumberErr && (
							<p className="text-xs text-red-500">{newAccountNumberErr}</p>
						)}
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
							className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:border-border/40 dark:bg-card dark:text-card-foreground"
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
							className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:border-border/40 dark:bg-card dark:text-card-foreground"
						>
							<option value="checking">Brukskonto</option>
							<option value="savings">Sparekonto</option>
							<option value="credit">Kredittkort</option>
							<option value="investment">Investering</option>
						</select>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="newOpeningBalance">Inngående saldo (NOK)</Label>
						<Input
							id="newOpeningBalance"
							value={newOpeningBalance}
							onChange={(e) => setNewOpeningBalance(e.target.value)}
							placeholder="0.00"
							inputMode="decimal"
							className={`max-w-xs ${newOpeningBalanceErr ? "border-red-400 focus-visible:ring-red-400" : ""}`}
						/>
						{newOpeningBalanceErr && (
							<p className="text-xs text-red-500">{newOpeningBalanceErr}</p>
						)}
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="newOpeningBalanceDate">Per dato</Label>
						<Input
							id="newOpeningBalanceDate"
							type="date"
							value={newOpeningBalanceDate}
							onChange={(e) => setNewOpeningBalanceDate(e.target.value)}
							className="max-w-xs"
						/>
					</div>
					<div className="flex gap-2">
						<Button
							onClick={handleCreate}
							disabled={isPending || !newName.trim() || !newFormValid}
							className="bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
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
								setNewOpeningBalance("");
								setNewOpeningBalanceDate("");
							}}
						>
							Avbryt
						</Button>
					</div>
				</div>
			) : (
				<Button
					onClick={() => setShowNewForm(true)}
					className="gap-2 bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
				>
					<Plus className="h-4 w-4" />
					Ny konto
				</Button>
			)}
		</div>
	);
}
