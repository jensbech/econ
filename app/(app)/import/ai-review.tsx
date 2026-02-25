"use client";

import {
	AlertTriangle,
	Check,
	CheckCircle,
	Eye,
	Lock,
	Loader2,
	Plus,
	Trash2,
	Undo2,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { rollbackImport } from "./actions";
import {
	type AiImportRow,
	type EnrichedTransaction,
	checkAiDuplicates,
	confirmAiImport,
	createExpenseCategory,
} from "./ai-actions";
import type { Category } from "./csv-import";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditableRow {
	id: string;
	date: string;
	amountNok: string;
	description: string;
	categoryId: string;
	categorySource: "history" | "ai" | "none";
	suggestedNewCategory: string | null;
	aiConfidence: "high" | "medium" | "low";
	deleted: boolean;
	accountId: string | null;
	loanId: string | null;
}

interface AccountOption {
	id: string;
	name: string;
}


interface LoanOption {
	id: string;
	name: string;
}

interface AiReviewProps {
	fileUrl: string;
	fileType: "image" | "pdf";
	filename: string;
	transactions: EnrichedTransaction[];
	categories: Category[];
	onDiscard: () => void;
	accountId?: string;
	accounts?: AccountOption[];
	scope?: "household" | "personal";
	loans?: LoanOption[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function oereToNokString(oere: number): string {
	return (oere / 100).toFixed(2);
}

function nokStringToOere(nok: string): number {
	const val = Number.parseFloat(nok.replace(",", "."));
	if (Number.isNaN(val)) return 0;
	return Math.round(val * 100);
}

// ─── Source badge with tooltip ────────────────────────────────────────────────

function SourceBadge({ source }: { source: EditableRow["categorySource"] }) {
	if (source === "history") {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<CheckCircle className="mx-auto h-4 w-4 cursor-default text-green-500" />
				</TooltipTrigger>
				<TooltipContent>Gjenkjent fra historikk</TooltipContent>
			</Tooltip>
		);
	}
	if (source === "ai") {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="mx-auto block h-2.5 w-2.5 cursor-default rounded-full bg-yellow-400" />
				</TooltipTrigger>
				<TooltipContent>AI-forslag — bør sjekkes</TooltipContent>
			</Tooltip>
		);
	}
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="mx-auto block h-2.5 w-2.5 cursor-default rounded-full bg-red-400" />
			</TooltipTrigger>
			<TooltipContent>Ingen kategori — tildel manuelt</TooltipContent>
		</Tooltip>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiReview({
	filename,
	transactions,
	categories,
	onDiscard,
	accountId,
	accounts = [],
	scope = "household",
	loans = [],
}: AiReviewProps) {
	const router = useRouter();

	const [rows, setRows] = useState<EditableRow[]>(() =>
		transactions.map((tx, i) => ({
			id: `${i}-${tx.date}-${tx.amountOere}`,
			date: tx.date,
			amountNok: oereToNokString(tx.amountOere),
			description: tx.description,
			categoryId: tx.categoryId ?? "",
			categorySource: tx.categorySource,
			suggestedNewCategory: tx.suggestedNewCategory,
			aiConfidence: tx.aiConfidence,
			deleted: false,
			accountId: tx.accountId ?? accountId ?? null,
			loanId: null,
		})),
	);

	const [localCategories, setLocalCategories] = useState<Category[]>(categories);
	const [creatingCategoryFor, setCreatingCategoryFor] = useState<string | null>(null);
	const [inlineInput, setInlineInput] = useState<{ rowId: string; value: string } | null>(null);
	const [isShared, setIsShared] = useState(false);
	const [duplicateFlags, setDuplicateFlags] = useState<boolean[]>([]);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [step, setStep] = useState<"review" | "done" | "error">("review");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [batchId, setBatchId] = useState<string | null>(null);
	const [insertedCount, setInsertedCount] = useState(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Run duplicate check once on mount
	useEffect(() => {
		checkAiDuplicates(
			transactions.map((tx) => ({ date: tx.date, amountOere: tx.amountOere })),
		).then(setDuplicateFlags);
	}, [transactions]);

	const visibleRows = useMemo(() => rows.filter((r) => !r.deleted), [rows]);

	const duplicateCount = useMemo(
		() => rows.filter((r, i) => !r.deleted && (duplicateFlags[i] ?? false)).length,
		[rows, duplicateFlags],
	);

	const selectedCount = useMemo(
		() => visibleRows.filter((r) => selectedIds.has(r.id)).length,
		[visibleRows, selectedIds],
	);

	const totalAmountNok = useMemo(
		() =>
			visibleRows.reduce(
				(sum, r) => sum + nokStringToOere(r.amountNok),
				0,
			) / 100,
		[visibleRows],
	);

	const allVisibleSelected =
		visibleRows.length > 0 && visibleRows.every((r) => selectedIds.has(r.id));
	const someVisibleSelected = visibleRows.some((r) => selectedIds.has(r.id));

	// ── Row helpers ──────────────────────────────────────────────────────────

	function updateRow(id: string, patch: Partial<EditableRow>) {
		setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
	}

	function deleteRow(id: string) {
		setRows((prev) => prev.map((r) => (r.id === id ? { ...r, deleted: true } : r)));
		setSelectedIds((prev) => {
			const s = new Set(prev);
			s.delete(id);
			return s;
		});
	}

	function deleteSelected() {
		const toDelete = new Set(selectedIds);
		setRows((prev) =>
			prev.map((r) => (toDelete.has(r.id) ? { ...r, deleted: true } : r)),
		);
		setSelectedIds(new Set());
	}

	function discardAllSuspicious() {
		const suspiciousIds = new Set(
			rows.filter((_, i) => duplicateFlags[i] ?? false).map((r) => r.id),
		);
		setRows((prev) =>
			prev.map((r) => (suspiciousIds.has(r.id) ? { ...r, deleted: true } : r)),
		);
		setSelectedIds((prev) => {
			const s = new Set(prev);
			for (const id of suspiciousIds) s.delete(id);
			return s;
		});
	}

	// ── Multiselect ──────────────────────────────────────────────────────────

	function toggleSelectAll() {
		if (allVisibleSelected) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(visibleRows.map((r) => r.id)));
		}
	}

	function toggleSelectRow(id: string) {
		setSelectedIds((prev) => {
			const s = new Set(prev);
			if (s.has(id)) s.delete(id);
			else s.add(id);
			return s;
		});
	}

	// ── Inline category creation ─────────────────────────────────────────────

	async function handleCreateCategory(rowId: string, name: string) {
		if (!name.trim()) return;
		setInlineInput(null);
		setCreatingCategoryFor(rowId);
		try {
			const newCat = await createExpenseCategory(name.trim());
			setLocalCategories((prev) => [...prev, newCat]);
			setRows((prev) =>
				prev.map((r) =>
					r.id === rowId
						? {
								...r,
								categoryId: newCat.id,
								categorySource: "ai" as const,
								suggestedNewCategory: null,
							}
						: r,
				),
			);
		} catch {
			// Silent — user can manually pick a category
		} finally {
			setCreatingCategoryFor(null);
		}
	}

	// ── Confirm modal summary ────────────────────────────────────────────────

	const confirmSummary = useMemo(() => {
		const active = rows.filter((r) => !r.deleted);
		const categorized = active.filter((r) => r.categoryId).length;
		const uncategorized = active.filter((r) => !r.categoryId).length;
		const suspicious = active.filter((r) => {
			const origIdx = rows.indexOf(r);
			return duplicateFlags[origIdx] ?? false;
		}).length;
		const fromHistory = active.filter(
			(r) => r.categorySource === "history" && r.categoryId,
		).length;
		const fromAi = active.filter(
			(r) => r.categorySource === "ai" && r.categoryId,
		).length;
		return { total: active.length, categorized, uncategorized, suspicious, fromHistory, fromAi };
	}, [rows, duplicateFlags]);

	// ── Submit ───────────────────────────────────────────────────────────────

	async function handleConfirm() {
		setShowConfirmModal(false);
		setIsSubmitting(true);
		try {
			const result = await confirmAiImport(
				filename,
				visibleRows.map(
					(r): AiImportRow => ({
						date: r.date,
						amountOere: nokStringToOere(r.amountNok),
						description: r.description,
						categoryId: r.categoryId || null,
						accountId: r.accountId ?? undefined,
						loanId: r.loanId ?? undefined,
					}),
				),
				accountId ?? null,
				scope,
				isShared,
			);
			setBatchId(result.batchId);
			setInsertedCount(result.inserted);
			setStep("done");
		} catch (e) {
			setErrorMessage(e instanceof Error ? e.message : "Importering feilet.");
			setStep("error");
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleRollback() {
		if (!batchId) return;
		await rollbackImport(batchId);
		router.refresh();
		onDiscard();
	}

	// ── Done ─────────────────────────────────────────────────────────────────

	if (step === "done") {
		return (
			<div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900/50 dark:bg-green-900/20">
				<div className="flex items-start gap-3">
					<CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
					<p className="text-sm font-medium text-green-700 dark:text-green-400">
						{insertedCount} transaksjon{insertedCount !== 1 ? "er" : ""} importert fra{" "}
						{filename}
					</p>
				</div>
				<div className="mt-4 flex flex-wrap gap-2">
					<Button
						size="sm"
						onClick={() => router.push(`/expenses?importBatch=${batchId ?? ""}`)}
						className="bg-green-600 text-white hover:bg-green-700"
					>
						Se importerte utgifter
					</Button>
					{batchId && (
						<Button variant="outline" size="sm" onClick={handleRollback}>
							<Undo2 className="mr-1.5 h-3.5 w-3.5" />
							Angre import
						</Button>
					)}
					<Button variant="ghost" size="sm" onClick={onDiscard}>
						Last opp ny fil
					</Button>
				</div>
			</div>
		);
	}

	// ── Error ─────────────────────────────────────────────────────────────────

	if (step === "error") {
		return (
			<div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-900/20">
				<p className="text-sm text-red-700 dark:text-red-400">
					{errorMessage ?? "Noe gikk galt under importeringen."}
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setStep("review")}
					className="mt-3"
				>
					Pr&oslash;v igjen
				</Button>
			</div>
		);
	}

	// ── Submitting spinner ────────────────────────────────────────────────────

	if (isSubmitting) {
		return (
			<div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-sm text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300">
				<Loader2 className="h-5 w-5 shrink-0 animate-spin" />
				<p className="font-medium">Lagrer transaksjoner&hellip;</p>
			</div>
		);
	}

	// ── Shared category cell renderer ─────────────────────────────────────────

	function CategoryCell({ row }: { row: EditableRow }) {
		const isCreating = creatingCategoryFor === row.id;
		const isInlineInputRow = inlineInput?.rowId === row.id;

		if (isCreating) {
			return (
				<div className="flex h-7 items-center gap-1.5 text-xs text-gray-500">
					<Loader2 className="h-3.5 w-3.5 animate-spin" />
					Oppretter&hellip;
				</div>
			);
		}
		if (isInlineInputRow) {
			return (
				<div className="flex items-center gap-1">
					<input
						// biome-ignore lint/a11y/noAutofocus: intentional focus for inline input
						autoFocus
						type="text"
						value={inlineInput.value}
						onChange={(e) =>
							setInlineInput((prev) =>
								prev ? { ...prev, value: e.target.value } : null,
							)
						}
						onKeyDown={(e) => {
							if (e.key === "Enter")
								handleCreateCategory(row.id, inlineInput.value);
							if (e.key === "Escape") setInlineInput(null);
						}}
						placeholder="Kategorinavn&hellip;"
						className="w-full rounded border border-indigo-300 bg-white px-1.5 py-0.5 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none dark:border-indigo-700 dark:bg-gray-900 dark:text-gray-300"
					/>
					<button
						type="button"
						onClick={() => handleCreateCategory(row.id, inlineInput.value)}
						className="rounded p-0.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
						title="Opprett kategori"
					>
						<Check className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						onClick={() => setInlineInput(null)}
						className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
						title="Avbryt"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				</div>
			);
		}
		return (
			<Select
				value={row.categoryId || "none"}
				onValueChange={(v) => {
					if (v === "__add_new__") {
						setInlineInput({
							rowId: row.id,
							value: row.suggestedNewCategory ?? "",
						});
					} else {
						updateRow(row.id, {
							categoryId: v === "none" ? "" : v,
							categorySource: v === "none" ? "none" : "ai",
						});
					}
				}}
			>
				<SelectTrigger className="h-7 w-full border-gray-200 text-xs dark:border-gray-700">
					<SelectValue placeholder="Velg&hellip;" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">
						<span className="text-gray-400">Ingen</span>
					</SelectItem>
					{localCategories.map((cat) => (
						<SelectItem key={cat.id} value={cat.id}>
							{cat.name}
						</SelectItem>
					))}
					<SelectItem value="__add_new__">
						<span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
							<Plus className="h-3 w-3" />
							{row.suggestedNewCategory
								? `Opprett «${row.suggestedNewCategory}»…`
								: "Ny kategori…"}
						</span>
					</SelectItem>
				</SelectContent>
			</Select>
		);
	}

	function LoanCell({ row }: { row: EditableRow }) {
		const catName = localCategories.find((c) => c.id === row.categoryId)?.name;
		if (catName !== "Lån" || loans.length === 0) return null;
		return (
			<Select
				value={row.loanId ?? "none"}
				onValueChange={(v) =>
					updateRow(row.id, { loanId: v === "none" ? null : v })
				}
			>
				<SelectTrigger className="h-7 border-gray-200 text-xs dark:border-gray-700">
					<SelectValue placeholder="Lån…" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">
						<span className="text-gray-400">Ingen</span>
					</SelectItem>
					{loans.map((l) => (
						<SelectItem key={l.id} value={l.id}>
							{l.name}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	// ── Main review layout ────────────────────────────────────────────────────

	return (
		<TooltipProvider delayDuration={300}>
			{/* Confirmation modal */}
			<Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Bekreft import</DialogTitle>
						<DialogDescription>
							Du er i ferd med &aring; importere{" "}
							<span className="font-medium">{confirmSummary.total}</span> transaksjon
							{confirmSummary.total !== 1 ? "er" : ""} fra{" "}
							<span className="font-medium">{filename}</span>.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-1.5 text-sm">
						<div className="flex justify-between rounded-md px-2 py-1">
							<span className="text-gray-500 dark:text-gray-400">Totalt</span>
							<span className="font-semibold dark:text-white">{confirmSummary.total}</span>
						</div>
						<div className="flex justify-between rounded-md px-2 py-1">
							<span className="text-gray-500 dark:text-gray-400">Med kategori</span>
							<span className="font-medium text-green-600 dark:text-green-400">{confirmSummary.categorized}</span>
						</div>
						{confirmSummary.fromHistory > 0 && (
							<div className="flex justify-between rounded-md px-2 py-0.5 pl-6">
								<span className="text-gray-400">Fra historikk</span>
								<span className="text-gray-600 dark:text-gray-300">{confirmSummary.fromHistory}</span>
							</div>
						)}
						{confirmSummary.fromAi > 0 && (
							<div className="flex justify-between rounded-md px-2 py-0.5 pl-6">
								<span className="text-gray-400">AI-forslag</span>
								<span className="text-gray-600 dark:text-gray-300">{confirmSummary.fromAi}</span>
							</div>
						)}
						{confirmSummary.uncategorized > 0 && (
							<div className="flex justify-between rounded-md px-2 py-1">
								<span className="text-gray-500 dark:text-gray-400">Uten kategori</span>
								<span className="font-medium text-amber-600 dark:text-amber-400">
									{confirmSummary.uncategorized}
								</span>
							</div>
						)}
						{confirmSummary.suspicious > 0 && (
							<div className="mt-3 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-400">
								<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
								<span>
									{confirmSummary.suspicious} mulig
									{confirmSummary.suspicious !== 1 ? "e" : ""} duplikat
									{confirmSummary.suspicious !== 1 ? "er" : ""} — samme dato og beløp
									finnes allerede
								</span>
							</div>
						)}
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setShowConfirmModal(false)}>
							Avbryt
						</Button>
						<Button
							onClick={handleConfirm}
							className="bg-indigo-600 text-white hover:bg-indigo-700"
						>
							Bekreft og importer
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div>
				{/* Personal import: privacy toggle */}
				{scope === "personal" && (
					<div className="mb-4 flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 dark:border-purple-900/50 dark:bg-purple-900/20">
						<div className="flex items-center gap-2 text-sm text-purple-800 dark:text-purple-300">
							{isShared ? (
								<Eye className="h-4 w-4 shrink-0" />
							) : (
								<Lock className="h-4 w-4 shrink-0" />
							)}
							<span>
								{isShared
									? "Delt med husholdning — vises i utgiftslisten for alle"
									: "Privat — kun synlig for deg"}
							</span>
						</div>
						<button
							type="button"
							onClick={() => setIsShared((v) => !v)}
							className="ml-4 shrink-0 rounded-full border border-purple-300 bg-white px-3 py-1 text-xs font-medium text-purple-700 transition hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/60"
						>
							{isShared ? "Gjør privat" : "Del med husholdning"}
						</button>
					</div>
				)}

				{/* Header + action buttons */}
				<div className="mb-3 flex flex-wrap items-center gap-2">
					<div className="mr-auto">
						<p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
							Transaksjoner ({visibleRows.length})
						</p>
						<p className="text-xs tabular-nums text-gray-400 dark:text-gray-500">
							Totalsum: {totalAmountNok.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
						</p>
					</div>

					{selectedCount > 0 && (
						<Button
							variant="outline"
							size="sm"
							onClick={deleteSelected}
							className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
						>
							<Trash2 className="mr-1.5 h-3.5 w-3.5" />
							Slett valgte ({selectedCount})
						</Button>
					)}

					{duplicateCount > 0 && (
						<Button
							variant="outline"
							size="sm"
							onClick={discardAllSuspicious}
							className="border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900/20"
						>
							<AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
							Forkast mistenkelige ({duplicateCount})
						</Button>
					)}

					<Button
						variant="outline"
						size="sm"
						onClick={onDiscard}
						disabled={isSubmitting}
					>
						Forkast alt
					</Button>

					<Button
						size="sm"
						onClick={() => setShowConfirmModal(true)}
						disabled={visibleRows.length === 0 || isSubmitting}
						className="bg-indigo-600 text-white hover:bg-indigo-700"
					>
						Bekreft import ({visibleRows.length} rader)
					</Button>
				</div>

				{/* Empty state */}
				{visibleRows.length === 0 ? (
					<div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
						Ingen transaksjoner igjen. Klikk &laquo;Forkast alt&raquo; for &aring; avbryte.
					</div>
				) : (
					<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
						{/* ── Desktop table (sm and up) ── */}
						<div className="hidden sm:block max-h-[calc(100vh-320px)] overflow-y-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 z-10">
									<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
										<th className="w-8 px-2 py-2.5">
											<input
												type="checkbox"
												checked={allVisibleSelected}
												ref={(el) => {
													if (el)
														el.indeterminate =
															!allVisibleSelected && someVisibleSelected;
												}}
												onChange={toggleSelectAll}
												className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-indigo-600"
											/>
										</th>
										<th className="w-6 px-1 py-2.5 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
											#
										</th>
										<th className="w-[104px] px-2 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
											Dato
										</th>
										<th className="w-[96px] px-2 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
											Beløp
										</th>
										<th className="px-2 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
											Beskrivelse
										</th>
										<th className="w-[150px] px-2 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
											Konto
										</th>
										<th className="w-[172px] px-2 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
											Kategori
										</th>
										<th className="w-[150px] px-2 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
											Kobling
										</th>
										<th className="w-[30px] px-1 py-2.5" />
										<th className="w-[30px] px-1 py-2.5" />
										<th className="w-[30px] px-1 py-2.5" />
									</tr>
								</thead>
								<tbody>
									{rows
										.filter((r) => !r.deleted)
										.map((row, visibleIndex) => {
											const originalIndex = rows.indexOf(row);
											const isDuplicate = duplicateFlags[originalIndex] ?? false;
											const isSelected = selectedIds.has(row.id);
											const isEven = visibleIndex % 2 === 0;

											return (
												<tr
													key={row.id}
													className={`border-b border-gray-100 last:border-b-0 transition-colors dark:border-gray-800 ${
														isSelected
															? "bg-indigo-50 dark:bg-indigo-900/15"
															: row.categorySource === "none"
																? isEven
																	? "bg-amber-50/60 dark:bg-amber-900/10"
																	: "bg-amber-50/30 dark:bg-amber-900/5"
																: isEven
																	? "bg-white dark:bg-gray-900"
																	: "bg-gray-50/50 dark:bg-gray-900/50"
													}`}
												>
													<td className="px-2 py-1.5 text-center">
														<input
															type="checkbox"
															checked={isSelected}
															onChange={() => toggleSelectRow(row.id)}
															className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-indigo-600"
														/>
													</td>
													<td className="px-1 py-1.5 text-center text-[10px] tabular-nums text-gray-400 dark:text-gray-600">
														{visibleIndex + 1}
													</td>
													<td className="px-2 py-1.5">
														<input
															type="text"
															value={row.date}
															onChange={(e) =>
																updateRow(row.id, { date: e.target.value })
															}
															placeholder="dd.mm.yyyy"
															className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-gray-700 hover:border-gray-200 focus:border-indigo-400 focus:outline-none dark:text-gray-300 dark:hover:border-gray-600 dark:focus:border-indigo-500"
														/>
													</td>
													<td className="px-2 py-1.5">
														<input
															type="number"
															value={row.amountNok}
															onChange={(e) =>
																updateRow(row.id, { amountNok: e.target.value })
															}
															step="0.01"
															min="0"
															className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-right text-xs tabular-nums text-gray-700 hover:border-gray-200 focus:border-indigo-400 focus:outline-none dark:text-gray-300 dark:hover:border-gray-600 dark:focus:border-indigo-500"
														/>
													</td>
													<td className="px-2 py-1.5">
														<input
															type="text"
															value={row.description}
															onChange={(e) =>
																updateRow(row.id, { description: e.target.value })
															}
															className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-gray-700 hover:border-gray-200 focus:border-indigo-400 focus:outline-none dark:text-gray-300 dark:hover:border-gray-600 dark:focus:border-indigo-500"
														/>
													</td>
													<td className="px-2 py-1.5">
														{accounts.length > 0 && (
															<Select
																value={row.accountId ?? "none"}
																onValueChange={(v) =>
																	updateRow(row.id, {
																		accountId: v === "none" ? null : v,
																	})
																}
															>
																<SelectTrigger className="h-7 border-gray-200 text-xs dark:border-gray-700">
																	<SelectValue placeholder="Konto…" />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="none">
																		<span className="text-gray-400">Ingen</span>
																	</SelectItem>
																	{accounts.map((a) => (
																		<SelectItem key={a.id} value={a.id}>
																			{a.name}
																		</SelectItem>
																	))}
																</SelectContent>
															</Select>
														)}
													</td>
													<td className="px-2 py-1.5">
														<CategoryCell row={row} />
													</td>
													<td className="px-2 py-1.5">
														<LoanCell row={row} />
													</td>
													<td className="px-1 py-1.5 text-center">
														<SourceBadge source={row.categorySource} />
													</td>
													<td className="px-1 py-1.5 text-center">
														{isDuplicate && (
															<Tooltip>
																<TooltipTrigger asChild>
																	<AlertTriangle className="mx-auto h-4 w-4 cursor-default text-orange-400" />
																</TooltipTrigger>
																<TooltipContent>
																	Mulig duplikat — samme dato og beløp finnes allerede
																</TooltipContent>
															</Tooltip>
														)}
													</td>
													<td className="px-1 py-1.5 text-center">
														<Tooltip>
															<TooltipTrigger asChild>
																<button
																	type="button"
																	onClick={() => deleteRow(row.id)}
																	className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
																>
																	<Trash2 className="h-3.5 w-3.5" />
																</button>
															</TooltipTrigger>
															<TooltipContent>Fjern rad</TooltipContent>
														</Tooltip>
													</td>
												</tr>
											);
										})}
								</tbody>
							</table>
						</div>

						{/* ── Mobile cards (below sm) ── */}
						<div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800 max-h-[70svh] overflow-y-auto">
							{/* Mobile select-all bar */}
							<div className="flex items-center gap-2 bg-gray-50 px-3 py-2 dark:bg-gray-800">
								<input
									type="checkbox"
									checked={allVisibleSelected}
									ref={(el) => {
										if (el)
											el.indeterminate =
												!allVisibleSelected && someVisibleSelected;
									}}
									onChange={toggleSelectAll}
									className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-indigo-600"
								/>
								<span className="text-xs text-gray-500 dark:text-gray-400">
									Velg alle
								</span>
							</div>

							{rows
								.filter((r) => !r.deleted)
								.map((row, visibleIndex) => {
									const originalIndex = rows.indexOf(row);
									const isDuplicate = duplicateFlags[originalIndex] ?? false;
									const isSelected = selectedIds.has(row.id);

									return (
										<div
											key={row.id}
											className={`space-y-2 p-3 transition-colors ${
												isSelected
													? "bg-indigo-50 dark:bg-indigo-900/15"
													: row.categorySource === "none"
														? "bg-amber-50/60 dark:bg-amber-900/10"
														: "bg-white dark:bg-gray-900"
											}`}
										>
											{/* Row 1: checkbox + number + date + amount + badges + delete */}
											<div className="flex items-center gap-2">
												<input
													type="checkbox"
													checked={isSelected}
													onChange={() => toggleSelectRow(row.id)}
													className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-indigo-600"
												/>
												<span className="w-5 shrink-0 text-center text-[10px] tabular-nums text-gray-400 dark:text-gray-600">
													{visibleIndex + 1}
												</span>
												<input
													type="text"
													value={row.date}
													onChange={(e) =>
														updateRow(row.id, { date: e.target.value })
													}
													placeholder="dd.mm.yyyy"
													className="w-24 shrink-0 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-gray-700 hover:border-gray-200 focus:border-indigo-400 focus:outline-none dark:text-gray-300 dark:hover:border-gray-600"
												/>
												<input
													type="number"
													value={row.amountNok}
													onChange={(e) =>
														updateRow(row.id, { amountNok: e.target.value })
													}
													step="0.01"
													min="0"
													className="ml-auto w-24 shrink-0 rounded border border-transparent bg-transparent px-1.5 py-0.5 text-right text-xs tabular-nums text-gray-700 hover:border-gray-200 focus:border-indigo-400 focus:outline-none dark:text-gray-300"
												/>
												<span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">kr</span>
												<SourceBadge source={row.categorySource} />
												{isDuplicate && (
													<Tooltip>
														<TooltipTrigger asChild>
															<AlertTriangle className="h-4 w-4 shrink-0 cursor-default text-orange-400" />
														</TooltipTrigger>
														<TooltipContent>
															Mulig duplikat — samme dato og beløp finnes allerede
														</TooltipContent>
													</Tooltip>
												)}
												<button
													type="button"
													onClick={() => deleteRow(row.id)}
													className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>

											{/* Row 2: description */}
											<input
												type="text"
												value={row.description}
												onChange={(e) =>
													updateRow(row.id, { description: e.target.value })
												}
												placeholder="Beskrivelse"
												className="w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 text-xs text-gray-700 hover:border-gray-200 focus:border-indigo-400 focus:outline-none dark:text-gray-300 dark:hover:border-gray-600"
											/>

											{/* Row 3: category */}
											<CategoryCell row={row} />

											{/* Row 4: account + loan */}
											<div className="flex gap-2">
												{accounts.length > 0 && (
													<Select
														value={row.accountId ?? "none"}
														onValueChange={(v) =>
															updateRow(row.id, {
																accountId: v === "none" ? null : v,
															})
														}
													>
														<SelectTrigger className="h-8 flex-1 border-gray-200 text-xs dark:border-gray-700">
															<SelectValue placeholder="Konto…" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="none">
																<span className="text-gray-400">Ingen</span>
															</SelectItem>
															{accounts.map((a) => (
																<SelectItem key={a.id} value={a.id}>
																	{a.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
												<LoanCell row={row} />
											</div>
										</div>
									);
								})}
						</div>
					</div>
				)}

				{/* Legend */}
				<div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
					<span className="flex items-center gap-1.5">
						<CheckCircle className="h-3.5 w-3.5 text-green-500" />
						Gjenkjent fra historikk
					</span>
					<span className="flex items-center gap-1.5">
						<span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
						AI-forslag — bør sjekkes
					</span>
					<span className="flex items-center gap-1.5">
						<span className="inline-block h-2 w-2 rounded-full bg-red-400" />
						Ingen kategori
					</span>
					<span className="flex items-center gap-1.5">
						<AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
						Mulig duplikat
					</span>
				</div>
			</div>
		</TooltipProvider>
	);
}
