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
import { deleteIncomeNoRedirect } from "./actions";

export type IncomeRow = {
	id: string;
	date: string;
	source: string | null;
	type: "salary" | "variable";
	amountOere: number;
	categoryId: string | null;
	categoryName: string | null;
	recurringTemplateId: string | null;
};

export type CategoryOption = {
	id: string;
	name: string;
};

type ViewMode = "monthly" | "yearly";

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

function generateYearOptions(): { value: string; label: string }[] {
	const options: { value: string; label: string }[] = [];
	const currentYear = new Date().getFullYear();
	for (let y = currentYear; y >= currentYear - 5; y--) {
		options.push({ value: String(y), label: String(y) });
	}
	return options;
}

function parseLocalDate(dateStr: string): Date {
	return new Date(`${dateStr}T12:00:00`);
}

const selectClass =
	"h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white";

const typeLabels: Record<string, string> = {
	salary: "Lønn",
	variable: "Variabel",
};

const columns: ColumnDef<IncomeRow>[] = [
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
		accessorKey: "source",
		header: "Kilde",
		cell: ({ row }) =>
			row.original.source ? (
				<span className="text-gray-700 dark:text-gray-300">
					{row.original.source}
				</span>
			) : (
				<span className="italic text-gray-400">—</span>
			),
	},
	{
		accessorKey: "type",
		header: "Type",
		cell: ({ row }) => (
			<Badge
				variant="outline"
				className={
					row.original.type === "salary"
						? "border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
						: "border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-400"
				}
			>
				{typeLabels[row.original.type] ?? row.original.type}
			</Badge>
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
			<div className="text-right font-medium text-green-600 dark:text-green-400">
				{formatNOK(row.original.amountOere)}
			</div>
		),
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const income = row.original;
			const boundDelete = deleteIncomeNoRedirect.bind(null, income.id);
			return (
				<div className="flex items-center justify-end gap-1">
					<Button variant="ghost" size="icon" className="h-8 w-8" asChild>
						<Link
							href={`/income/${income.id}/edit`}
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
								<AlertDialogTitle>Slett inntekt</AlertDialogTitle>
								<AlertDialogDescription>
									Er du sikker på at du vil slette denne inntekten? Denne
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

interface IncomeTableProps {
	incomes: IncomeRow[];
	categories: CategoryOption[];
}

export function IncomeTable({ incomes, categories }: IncomeTableProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const [selectedIncome, setSelectedIncome] = useState<IncomeRow | null>(null);
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "date", desc: true },
	]);

	useEffect(() => {
		if (selectedIncome && !incomes.find((e) => e.id === selectedIncome.id)) {
			setSelectedIncome(null);
		}
	}, [incomes, selectedIncome]);

	const viewParam = (searchParams.get("view") as ViewMode) ?? "monthly";
	const monthParam = searchParams.get("month");
	const yearParam = searchParams.get("year");
	const categoryParam = searchParams.get("categoryId") ?? "";

	const currentMonthValue = monthParam ?? format(new Date(), "yyyy-MM");
	const currentYearValue = yearParam ?? String(new Date().getFullYear());

	const monthOptions = useMemo(() => generateMonthOptions(), []);
	const yearOptions = useMemo(() => generateYearOptions(), []);

	function updateParams(updates: Record<string, string | null>) {
		const params = new URLSearchParams(searchParams.toString());
		for (const [key, value] of Object.entries(updates)) {
			if (value === null || value === "") {
				params.delete(key);
			} else {
				params.set(key, value);
			}
		}
		router.push(`/income?${params.toString()}`);
	}

	function handleViewChange(view: ViewMode) {
		updateParams({ view });
	}

	function handleMonthChange(month: string) {
		updateParams({ month });
	}

	function handleYearChange(year: string) {
		updateParams({ year });
	}

	function handleCategoryChange(categoryId: string) {
		updateParams({ categoryId: categoryId || null });
	}

	const table = useReactTable({
		data: incomes,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: { sorting },
	});

	const total = incomes.reduce((sum, e) => sum + e.amountOere, 0);

	const viewLabel = viewParam === "yearly" ? "år" : "måned";

	return (
		<div className="space-y-4">
			{/* View toggle + Filters */}
			<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
		<div className="flex flex-wrap items-end gap-4 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
				{/* Monthly / Yearly toggle */}
				<div className="space-y-1">
					<p className="text-xs font-medium text-gray-500 dark:text-gray-400">
						Visning
					</p>
					<div className="flex rounded-md border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-700 dark:bg-gray-800">
						<button
							type="button"
							onClick={() => handleViewChange("monthly")}
							className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
								viewParam === "monthly"
									? "bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
									: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							}`}
						>
							Månedlig
						</button>
						<button
							type="button"
							onClick={() => handleViewChange("yearly")}
							className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
								viewParam === "yearly"
									? "bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
									: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
							}`}
						>
							Årlig
						</button>
					</div>
				</div>

				{/* Period picker */}
				<div className="space-y-1">
					<p className="text-xs font-medium text-gray-500 dark:text-gray-400">
						Periode
					</p>
					{viewParam === "monthly" ? (
						<select
							value={currentMonthValue}
							onChange={(e) => handleMonthChange(e.target.value)}
							className={selectClass}
						>
							{monthOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					) : (
						<select
							value={currentYearValue}
							onChange={(e) => handleYearChange(e.target.value)}
							className={selectClass}
						>
							{yearOptions.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					)}
				</div>

				{/* Category filter */}
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
			<div className="overflow-x-auto">
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
									onClick={() => setSelectedIncome(row.original)}
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
									Ingen inntekter funnet for valgt periode.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
					<TableFooter>
						<TableRow className="border-t border-gray-100 dark:border-gray-800">
							<TableCell
								colSpan={4}
								className="text-sm font-medium text-gray-600 dark:text-gray-400"
							>
								Totalt for {viewLabel} ({incomes.length}{" "}
								{incomes.length === 1 ? "inntekt" : "inntekter"})
							</TableCell>
							<TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
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
				open={selectedIncome !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedIncome(null);
				}}
			>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Inntektsdetaljer</SheetTitle>
					</SheetHeader>
					{selectedIncome && (
						<div className="mt-6 space-y-5 px-1">
							<div>
								<p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
									Dato
								</p>
								<p className="text-sm font-medium text-gray-900 dark:text-white">
									{format(parseLocalDate(selectedIncome.date), "d. MMMM yyyy", {
										locale: nb,
									})}
								</p>
							</div>

							<div>
								<p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
									Beløp
								</p>
								<p className="text-2xl font-bold text-green-600 dark:text-green-400">
									{formatNOK(selectedIncome.amountOere)}
								</p>
							</div>

							<div>
								<p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
									Type
								</p>
								<Badge
									variant="outline"
									className={
										selectedIncome.type === "salary"
											? "border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
											: "border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-400"
									}
								>
									{typeLabels[selectedIncome.type] ?? selectedIncome.type}
								</Badge>
							</div>

							{selectedIncome.source && (
								<div>
									<p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
										Kilde
									</p>
									<p className="text-sm text-gray-700 dark:text-gray-300">
										{selectedIncome.source}
									</p>
								</div>
							)}

							{selectedIncome.categoryName && (
								<div>
									<p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
										Kategori
									</p>
									<Badge variant="secondary">
										{selectedIncome.categoryName}
									</Badge>
								</div>
							)}

							<div className="pt-2">
								<Button
									asChild
									className="w-full gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
								>
									<Link href={`/income/${selectedIncome.id}/edit`}>
										<Pencil className="h-4 w-4" />
										Rediger inntekt
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
