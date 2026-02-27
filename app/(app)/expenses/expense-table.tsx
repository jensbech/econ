"use client";

import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
	ArrowUpDown,
	BarChart3,
	Pencil,
	Search,
	Trash2,
	UserCircle,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
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
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatNOK } from "@/lib/format";
import { deleteExpenseNoRedirect } from "./actions";

export type ExpenseRow = {
	id: string;
	date: string;
	notes: string | null;
	amountOere: number;
	categoryId: string | null;
	categoryName: string | null;
	accountName?: string | null;
	scope: string;
	uploaderName: string | null;
	loanId?: string | null;
	interestOere?: number | null;
	principalOere?: number | null;
	loanName?: string | null;
};

export type CategoryOption = {
	id: string;
	name: string;
};

function generateMonthOptions(): { value: string; label: string }[] {
	const options: { value: string; label: string }[] = [];
	const now = new Date();
	for (let i = 0; i < 12; i++) {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		options.push({
			value: format(d, "yyyy-MM"),
			label: format(d, "MMMM yyyy", { locale: nb }),
		});
	}
	return options;
}

function parseLocalDate(dateStr: string): Date {
	return new Date(`${dateStr}T12:00:00`);
}

const selectClass =
	"h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:border-border/40 dark:bg-card dark:text-card-foreground";

interface ExpenseTableProps {
	expenses: ExpenseRow[];
	categories: CategoryOption[];
	importBatchId?: string;
}

export function ExpenseTable({
	expenses,
	categories,
	importBatchId,
}: ExpenseTableProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();

	const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(
		null,
	);
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "date", desc: true },
	]);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (selectedExpense && !expenses.find((e) => e.id === selectedExpense.id)) {
			setSelectedExpense(null);
		}
	}, [expenses, selectedExpense]);

	const monthParam = searchParams.get("month");
	const categoryParam = searchParams.get("categoryId") ?? "";
	const fromParam = searchParams.get("from") ?? "";
	const toParam = searchParams.get("to") ?? "";
	const showDateRange = monthParam === "all";
	const currentMonthValue = monthParam ?? format(new Date(), "yyyy-MM");

	const monthOptions = useMemo(() => generateMonthOptions(), []);

	// Client-side text search filter
	const filteredExpenses = useMemo(() => {
		if (!searchQuery.trim()) return expenses;
		const q = searchQuery.toLowerCase();
		return expenses.filter(
			(e) =>
				e.notes?.toLowerCase().includes(q) ||
				e.categoryName?.toLowerCase().includes(q) ||
				e.accountName?.toLowerCase().includes(q) ||
				formatNOK(e.amountOere).includes(q),
		);
	}, [expenses, searchQuery]);

	function updateParams(updates: Record<string, string | null>) {
		const params = new URLSearchParams(searchParams.toString());
		for (const [key, value] of Object.entries(updates)) {
			if (value === null || value === "") {
				params.delete(key);
			} else {
				params.set(key, value);
			}
		}
		router.push(`/expenses?${params.toString()}`);
	}

	function handleMonthChange(month: string) {
		if (month === "all") {
			updateParams({ month: "all", from: null, to: null });
		} else {
			updateParams({ month, from: null, to: null });
		}
	}

	function handleCategoryChange(categoryId: string) {
		updateParams({ categoryId: categoryId || null });
	}

	function handleFromChange(from: string) {
		updateParams({ from });
	}

	function handleToChange(to: string) {
		updateParams({ to });
	}

	function handleDelete(id: string, notes: string | null) {
		startTransition(async () => {
			try {
				const result = await deleteExpenseNoRedirect(id);
				if (result && "error" in result) {
					toast.error(result.error);
					return;
				}
				toast.success("Utgift slettet", {
					description: notes ?? undefined,
				});
				router.refresh();
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Noe gikk galt");
			}
		});
	}

	const columns: ColumnDef<ExpenseRow>[] = useMemo(
		() => [
			{
				accessorKey: "date",
				header: ({ column }) => (
					<Button
						variant="ghost"
						size="sm"
						className="-ml-3 h-8"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					>
						Dato
						<ArrowUpDown className="ml-2 h-3 w-3" />
					</Button>
				),
				cell: ({ row }) => (
					<span className="whitespace-nowrap text-foreground dark:text-card-foreground">
						{format(parseLocalDate(row.original.date), "d. MMM yyyy", {
							locale: nb,
						})}
					</span>
				),
			},
			{
				accessorKey: "notes",
				header: "Beskrivelse",
				cell: ({ row }) => (
					<div className="flex items-center gap-2">
						{row.original.scope === "personal" && (
							<span
								className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
								title={`Personlig utgift fra ${row.original.uploaderName ?? "ukjent"}`}
							>
								<UserCircle className="h-3 w-3" />
								{row.original.uploaderName?.split(" ")[0] ?? "Privat"}
							</span>
						)}
						{row.original.loanId && (
							<span
								className="inline-flex items-center rounded-full bg-amber-100 p-1 dark:bg-amber-900/30"
								title={row.original.loanName ?? "Lån"}
							>
								<BarChart3 className="h-3 w-3 text-amber-600 dark:text-amber-400" />
							</span>
						)}
						{row.original.notes ? (
							<span className="text-foreground/80 dark:text-foreground/80">
								{row.original.notes}
							</span>
						) : (
							<span className="italic text-foreground/50">—</span>
						)}
					</div>
				),
			},
			{
				accessorKey: "categoryName",
				header: "Kategori",
				cell: ({ row }) =>
					row.original.categoryName ? (
						<Badge variant="secondary">{row.original.categoryName}</Badge>
					) : (
						<span className="text-sm text-foreground/50">—</span>
					),
			},
			{
				accessorKey: "accountName",
				header: "Konto",
				cell: ({ row }) =>
					row.original.accountName ? (
						<span className="text-sm text-foreground/70 dark:text-foreground/50">
							{row.original.accountName}
						</span>
					) : (
						<span className="text-sm text-foreground/50">—</span>
					),
			},
			{
				accessorKey: "amountOere",
				header: ({ column }) => (
					<div className="flex justify-end">
						<Button
							variant="ghost"
							size="sm"
							className="-mr-3 h-8"
							onClick={() =>
								column.toggleSorting(column.getIsSorted() === "asc")
							}
						>
							Beløp
							<ArrowUpDown className="ml-2 h-3 w-3" />
						</Button>
					</div>
				),
				cell: ({ row }) => (
					<div className="text-right font-medium tabular-nums text-red-600 dark:text-red-400">
						{formatNOK(row.original.amountOere)}
					</div>
				),
			},
			{
				id: "actions",
				cell: ({ row }) => {
					const expense = row.original;
					return (
						<div className="flex items-center justify-end gap-1">
							<Button variant="ghost" size="icon" className="h-8 w-8" asChild>
								<Link
									href={`/expenses/${expense.id}/edit`}
									onClick={(e) => e.stopPropagation()}
								>
									<Pencil className="h-4 w-4 text-foreground/60" />
								</Link>
							</Button>
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8"
										onClick={(e) => e.stopPropagation()}
									>
										<Trash2 className="h-4 w-4 text-red-400" />
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent onClick={(e) => e.stopPropagation()}>
									<AlertDialogHeader>
										<AlertDialogTitle>Slett utgift</AlertDialogTitle>
										<AlertDialogDescription>
											Er du sikker på at du vil slette denne utgiften? Denne
											handlingen kan ikke angres.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Avbryt</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => handleDelete(expense.id, expense.notes)}
											disabled={isPending}
											className="bg-red-600 hover:bg-red-700"
										>
											{isPending ? "Sletter..." : "Slett"}
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</div>
					);
				},
			},
		],
		[isPending],
	);

	const table = useReactTable({
		data: filteredExpenses,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: { sorting },
	});

	const total = filteredExpenses.reduce((sum, e) => sum + e.amountOere, 0);

	return (
		<div className="space-y-4">
			{/* Import batch banner */}
			{importBatchId && (
				<div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-primary/8 px-4 py-3 dark:border-indigo-900/50 dark:bg-primary/15/20">
					<p className="text-sm text-primary dark:text-primary/60">
						Viser <span className="font-semibold">{expenses.length}</span>{" "}
						importerte utgifter
					</p>
					<Link
						href="/expenses"
						className="flex items-center gap-1 text-xs font-medium text-foreground/70 hover:text-foreground dark:text-foreground/50 dark:hover:text-card-foreground"
					>
						<X className="h-3.5 w-3.5" />
						Nullstill filter
					</Link>
				</div>
			)}
			{/* Filters */}
			<div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card dark:border-border/40 dark:bg-card">
				<div className="flex flex-wrap items-end gap-3 border-b border-gray-100 px-4 py-3 dark:border-border/40">
					{/* Search */}
					<div className="space-y-1 flex-1 min-w-[180px]">
						<p className="text-xs font-medium text-foreground/60 dark:text-foreground/50">
							Søk
						</p>
						<div className="relative">
							<Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/50" />
							<Input
								type="search"
								placeholder="Søk i beskrivelse..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="h-9 pl-8"
							/>
						</div>
					</div>

					<div className="space-y-1">
						<p className="text-xs font-medium text-foreground/60 dark:text-foreground/50">
							Periode
						</p>
						<select
							value={currentMonthValue}
							onChange={(e) => handleMonthChange(e.target.value)}
							className={selectClass}
						>
							<option value="all">Alle måneder</option>
							{monthOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>

					{showDateRange && (
						<>
							<div className="space-y-1">
								<p className="text-xs font-medium text-foreground/60 dark:text-foreground/50">
									Fra dato
								</p>
								<input
									type="date"
									value={fromParam}
									onChange={(e) => handleFromChange(e.target.value)}
									className={selectClass}
								/>
							</div>
							<div className="space-y-1">
								<p className="text-xs font-medium text-foreground/60 dark:text-foreground/50">
									Til dato
								</p>
								<input
									type="date"
									value={toParam}
									onChange={(e) => handleToChange(e.target.value)}
									className={selectClass}
								/>
							</div>
						</>
					)}

					<div className="space-y-1">
						<p className="text-xs font-medium text-foreground/60 dark:text-foreground/50">
							Kategori
						</p>
						<select
							value={categoryParam}
							onChange={(e) => handleCategoryChange(e.target.value)}
							className={selectClass}
						>
							<option value="">Alle kategorier</option>
							{categories.map((cat) => (
								<option key={cat.id} value={cat.id}>
									{cat.name}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Table */}
				<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow
									key={headerGroup.id}
									className="border-b border-gray-100 hover:bg-transparent dark:border-border/40"
								>
									{headerGroup.headers.map((header) => (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.length > 0 ? (
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										onClick={() => setSelectedExpense(row.original)}
										className="cursor-pointer border-b border-gray-50 last:border-0 transition-colors hover:bg-background dark:border-border/40/50 dark:hover:bg-card/50"
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-32 text-center text-sm text-foreground/50"
									>
										{searchQuery
											? `Ingen utgifter funnet for «${searchQuery}»`
											: "Ingen utgifter funnet for valgt periode."}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
						<TableFooter>
							<TableRow className="border-t border-gray-100 dark:border-border/40">
								<TableCell
									colSpan={4}
									className="text-sm font-medium text-foreground/70 dark:text-foreground/50"
								>
									Totalt ({filteredExpenses.length}{" "}
									{filteredExpenses.length === 1 ? "utgift" : "utgifter"})
								</TableCell>
								<TableCell className="text-right font-semibold tabular-nums text-red-600 dark:text-red-400">
									{formatNOK(total)}
								</TableCell>
								<TableCell />
							</TableRow>
						</TableFooter>
					</Table>
				</div>
			</div>

			{/* Detail Sheet */}
			<Sheet
				open={selectedExpense !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedExpense(null);
				}}
			>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Utgiftsdetaljer</SheetTitle>
					</SheetHeader>
					{selectedExpense && (
						<div className="mt-6 space-y-5 px-1">
							<div>
								<p className="mb-1 text-xs font-medium text-foreground/60 dark:text-foreground/50">
									Dato
								</p>
								<p className="text-sm font-medium text-foreground dark:text-card-foreground">
									{format(
										parseLocalDate(selectedExpense.date),
										"d. MMMM yyyy",
										{ locale: nb },
									)}
								</p>
							</div>

							<div>
								<p className="mb-1 text-xs font-medium text-foreground/60 dark:text-foreground/50">
									Beløp
								</p>
								<p className="text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
									{formatNOK(selectedExpense.amountOere)}
								</p>
							</div>

							{selectedExpense.categoryName && (
								<div>
									<p className="mb-1 text-xs font-medium text-foreground/60 dark:text-foreground/50">
										Kategori
									</p>
									<Badge variant="secondary">
										{selectedExpense.categoryName}
									</Badge>
								</div>
							)}

							{selectedExpense.loanName && (
								<div>
									<p className="mb-1 text-xs font-medium text-foreground/60 dark:text-foreground/50">
										Lån
									</p>
									<div className="flex items-center gap-2">
										<BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
										<p className="text-sm text-foreground/80 dark:text-foreground/80">
											{selectedExpense.loanName}
										</p>
									</div>
									{(selectedExpense.interestOere != null ||
										selectedExpense.principalOere != null) && (
										<div className="mt-1.5 space-y-0.5 text-xs text-foreground/60 dark:text-foreground/50">
											{selectedExpense.interestOere != null && (
												<p>Renter: {formatNOK(selectedExpense.interestOere)}</p>
											)}
											{selectedExpense.principalOere != null && (
												<p>
													Avdrag: {formatNOK(selectedExpense.principalOere)}
												</p>
											)}
										</div>
									)}
								</div>
							)}

							{selectedExpense.accountName && (
								<div>
									<p className="mb-1 text-xs font-medium text-foreground/60 dark:text-foreground/50">
										Konto
									</p>
									<p className="text-sm text-foreground/80 dark:text-foreground/80">
										{selectedExpense.accountName}
									</p>
								</div>
							)}

							{selectedExpense.notes && (
								<div>
									<p className="mb-1 text-xs font-medium text-foreground/60 dark:text-foreground/50">
										Notater
									</p>
									<p className="text-sm text-foreground/80 dark:text-foreground/80">
										{selectedExpense.notes}
									</p>
								</div>
							)}

							<div className="pt-2">
								<Button
									asChild
									className="w-full gap-2 bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
								>
									<Link href={`/expenses/${selectedExpense.id}/edit`}>
										<Pencil className="h-4 w-4" />
										Rediger utgift
									</Link>
								</Button>
							</div>
						</div>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}
