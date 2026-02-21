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
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
	// Append noon time to avoid timezone-shift issues with yyyy-MM-dd strings
	return new Date(`${dateStr}T12:00:00`);
}

const selectClass =
	"h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const columns: ColumnDef<ExpenseRow>[] = [
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
			<span className="whitespace-nowrap text-gray-900 dark:text-white">
				{format(parseLocalDate(row.original.date), "d. MMM yyyy", {
					locale: nb,
				})}
			</span>
		),
	},
	{
		accessorKey: "notes",
		header: "Beskrivelse",
		cell: ({ row }) =>
			row.original.notes ? (
				<span className="text-gray-700 dark:text-gray-300">
					{row.original.notes}
				</span>
			) : (
				<span className="italic text-gray-400">—</span>
			),
	},
	{
		accessorKey: "categoryName",
		header: "Kategori",
		cell: ({ row }) =>
			row.original.categoryName ? (
				<Badge variant="secondary">{row.original.categoryName}</Badge>
			) : (
				<span className="text-sm text-gray-400">—</span>
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
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Beløp
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			</div>
		),
		cell: ({ row }) => (
			<div className="text-right font-medium text-red-600 dark:text-red-400">
				{formatNOK(row.original.amountOere)}
			</div>
		),
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const expense = row.original;
			const boundDelete = deleteExpenseNoRedirect.bind(null, expense.id);
			return (
				<div className="flex items-center justify-end gap-1">
					<Button variant="ghost" size="icon" className="h-8 w-8" asChild>
						<Link
							href={`/expenses/${expense.id}/edit`}
							onClick={(e) => e.stopPropagation()}
						>
							<Pencil className="h-4 w-4 text-gray-500" />
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
								<form action={boundDelete}>
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
				</div>
			);
		},
	},
];

interface ExpenseTableProps {
	expenses: ExpenseRow[];
	categories: CategoryOption[];
}

export function ExpenseTable({ expenses, categories }: ExpenseTableProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(
		null,
	);
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "date", desc: true },
	]);

	// Close the sheet if the selected expense is no longer in the list (e.g. after delete)
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

	const table = useReactTable({
		data: expenses,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: { sorting },
	});

	const total = expenses.reduce((sum, e) => sum + e.amountOere, 0);

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap items-end gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<div className="space-y-1">
					<p className="text-xs font-medium text-gray-500 dark:text-gray-400">
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
							<p className="text-xs font-medium text-gray-500 dark:text-gray-400">
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
							<p className="text-xs font-medium text-gray-500 dark:text-gray-400">
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
					<p className="text-xs font-medium text-gray-500 dark:text-gray-400">
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
			<div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								key={headerGroup.id}
								className="border-b border-gray-100 hover:bg-transparent dark:border-gray-800"
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
									className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:border-gray-800/50 dark:hover:bg-gray-800/50"
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
									className="h-32 text-center text-sm text-gray-400"
								>
									Ingen utgifter funnet for valgt periode.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
					<TableFooter>
						<TableRow className="border-t border-gray-100 dark:border-gray-800">
							<TableCell
								colSpan={3}
								className="text-sm font-medium text-gray-600 dark:text-gray-400"
							>
								Totalt ({expenses.length}{" "}
								{expenses.length === 1 ? "utgift" : "utgifter"})
							</TableCell>
							<TableCell className="text-right font-semibold text-red-600 dark:text-red-400">
								{formatNOK(total)}
							</TableCell>
							<TableCell />
						</TableRow>
					</TableFooter>
				</Table>
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
								<p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
									Dato
								</p>
								<p className="text-sm font-medium text-gray-900 dark:text-white">
									{format(
										parseLocalDate(selectedExpense.date),
										"d. MMMM yyyy",
										{
											locale: nb,
										},
									)}
								</p>
							</div>

							<div>
								<p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
									Beløp
								</p>
								<p className="text-2xl font-bold text-red-600 dark:text-red-400">
									{formatNOK(selectedExpense.amountOere)}
								</p>
							</div>

							{selectedExpense.categoryName && (
								<div>
									<p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
										Kategori
									</p>
									<Badge variant="secondary">
										{selectedExpense.categoryName}
									</Badge>
								</div>
							)}

							{selectedExpense.notes && (
								<div>
									<p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
										Notater
									</p>
									<p className="text-sm text-gray-700 dark:text-gray-300">
										{selectedExpense.notes}
									</p>
								</div>
							)}

							<div className="pt-2">
								<Button
									asChild
									className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
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
