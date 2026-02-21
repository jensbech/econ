"use client";

import { CheckCircle, Loader2, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ExtractedTransaction } from "@/lib/ai-extract";
import { rollbackImport } from "./actions";
import { confirmAiImport } from "./ai-actions";
import type { Category } from "./csv-import";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditableRow {
	id: string;
	date: string; // dd.mm.yyyy
	amountNok: string; // display as "123.45"
	description: string;
	categoryId: string;
	confidence: "high" | "medium" | "low";
	deleted: boolean;
}

interface AiReviewProps {
	fileUrl: string;
	fileType: "image" | "pdf";
	filename: string;
	transactions: ExtractedTransaction[];
	categories: Category[];
	onDiscard: () => void;
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

function findCategoryId(name: string, categories: Category[]): string {
	const lower = name.toLowerCase();
	const match = categories.find((c) => c.name.toLowerCase() === lower);
	return match?.id ?? "";
}

function ConfidenceDot({
	confidence,
}: {
	confidence: "high" | "medium" | "low";
}) {
	const color =
		confidence === "high"
			? "bg-green-500"
			: confidence === "medium"
				? "bg-yellow-400"
				: "bg-red-400";
	const label =
		confidence === "high" ? "Høy" : confidence === "medium" ? "Middels" : "Lav";
	return (
		<span
			className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
			title={label}
		/>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiReview({
	fileUrl,
	fileType,
	filename,
	transactions,
	categories,
	onDiscard,
}: AiReviewProps) {
	const router = useRouter();
	const [rows, setRows] = useState<EditableRow[]>(() =>
		transactions.map((tx, i) => ({
			id: `${i}-${tx.date}-${tx.amountOere}`,
			date: tx.date,
			amountNok: oereToNokString(tx.amountOere),
			description: tx.description,
			categoryId: findCategoryId(tx.suggestedCategory, categories),
			confidence: tx.confidence,
			deleted: false,
		})),
	);
	const [step, setStep] = useState<"review" | "done" | "error">("review");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [batchId, setBatchId] = useState<string | null>(null);
	const [insertedCount, setInsertedCount] = useState(0);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const visibleRows = rows.filter((r) => !r.deleted);

	function updateRow(id: string, patch: Partial<EditableRow>) {
		setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
	}

	function deleteRow(id: string) {
		setRows((prev) =>
			prev.map((r) => (r.id === id ? { ...r, deleted: true } : r)),
		);
	}

	async function handleConfirm() {
		setIsSubmitting(true);
		try {
			const result = await confirmAiImport(
				filename,
				visibleRows.map((r) => ({
					date: r.date,
					amountOere: nokStringToOere(r.amountNok),
					description: r.description,
					categoryId: r.categoryId || null,
				})),
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

	// ── Done ──────────────────────────────────────────────────────────────────

	if (step === "done") {
		return (
			<div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-900/50 dark:bg-green-900/20">
				<div className="flex items-start gap-3">
					<CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
					<div>
						<p className="text-sm font-medium text-green-700 dark:text-green-400">
							{insertedCount} transaksjon
							{insertedCount !== 1 ? "er" : ""} importert fra {filename}
						</p>
					</div>
				</div>
				<div className="mt-4 flex flex-wrap gap-2">
					<Button
						size="sm"
						onClick={() => router.push("/expenses")}
						className="bg-green-600 text-white hover:bg-green-700"
					>
						Se utgifter
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
					Prøv igjen
				</Button>
			</div>
		);
	}

	// ── Submitting spinner ────────────────────────────────────────────────────

	if (isSubmitting) {
		return (
			<div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-sm text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300">
				<Loader2 className="h-5 w-5 animate-spin shrink-0" />
				<p className="font-medium">Lagrer transaksjoner…</p>
			</div>
		);
	}

	// ── Main review layout ────────────────────────────────────────────────────

	return (
		<div className="flex gap-6">
			{/* Left: document viewer */}
			<div className="w-[44%] shrink-0">
				<p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
					Dokument
				</p>
				<div className="sticky top-4 h-[calc(100vh-260px)] overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
					{fileType === "pdf" ? (
						<iframe
							src={fileUrl}
							className="h-full w-full"
							title="Kontoutskrift"
						/>
					) : (
						<img
							src={fileUrl}
							alt="Kvittering"
							className="h-full w-full object-contain"
						/>
					)}
				</div>
			</div>

			{/* Right: editable transactions */}
			<div className="min-w-0 flex-1">
				{/* Header + action buttons */}
				<div className="mb-3 flex items-center justify-between">
					<p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
						Transaksjoner ({visibleRows.length})
					</p>
					<div className="flex gap-2">
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
							onClick={handleConfirm}
							disabled={visibleRows.length === 0 || isSubmitting}
							className="bg-indigo-600 text-white hover:bg-indigo-700"
						>
							Bekreft import ({visibleRows.length} rader)
						</Button>
					</div>
				</div>

				{/* Empty state */}
				{visibleRows.length === 0 ? (
					<div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
						Ingen transaksjoner igjen. Klikk «Forkast alt» for å avbryte.
					</div>
				) : (
					<div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
									<th className="w-[108px] px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
										Dato
									</th>
									<th className="w-[100px] px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
										Beløp (NOK)
									</th>
									<th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
										Beskrivelse
									</th>
									<th className="w-[156px] px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
										Kategori
									</th>
									<th className="w-[36px] px-3 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
										OK
									</th>
									<th className="w-[36px] px-3 py-2" />
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100 dark:divide-gray-700">
								{rows
									.filter((r) => !r.deleted)
									.map((row) => (
										<tr
											key={row.id}
											className={
												row.confidence === "low"
													? "bg-amber-50 dark:bg-amber-900/10"
													: "bg-white dark:bg-gray-900"
											}
										>
											{/* Date */}
											<td className="px-3 py-1.5">
												<input
													type="text"
													value={row.date}
													onChange={(e) =>
														updateRow(row.id, { date: e.target.value })
													}
													placeholder="dd.mm.yyyy"
													className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:text-gray-300"
												/>
											</td>

											{/* Amount */}
											<td className="px-3 py-1.5">
												<input
													type="number"
													value={row.amountNok}
													onChange={(e) =>
														updateRow(row.id, { amountNok: e.target.value })
													}
													step="0.01"
													min="0"
													className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-right text-xs tabular-nums text-gray-700 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:text-gray-300"
												/>
											</td>

											{/* Description */}
											<td className="px-3 py-1.5">
												<input
													type="text"
													value={row.description}
													onChange={(e) =>
														updateRow(row.id, { description: e.target.value })
													}
													className="w-full rounded border border-gray-200 bg-transparent px-2 py-1 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none dark:border-gray-700 dark:text-gray-300"
												/>
											</td>

											{/* Category */}
											<td className="px-3 py-1.5">
												<Select
													value={row.categoryId || "none"}
													onValueChange={(v) =>
														updateRow(row.id, {
															categoryId: v === "none" ? "" : v,
														})
													}
												>
													<SelectTrigger className="h-7 border-gray-200 text-xs dark:border-gray-700">
														<SelectValue placeholder="Velg…" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="none">
															<span className="text-gray-400">Ingen</span>
														</SelectItem>
														{categories.map((cat) => (
															<SelectItem key={cat.id} value={cat.id}>
																{cat.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</td>

											{/* Confidence dot */}
											<td className="px-3 py-1.5 text-center">
												<ConfidenceDot confidence={row.confidence} />
											</td>

											{/* Delete button */}
											<td className="px-3 py-1.5 text-center">
												<button
													type="button"
													onClick={() => deleteRow(row.id)}
													className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
													title="Fjern rad"
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
				)}

				{/* Confidence legend */}
				{visibleRows.some((r) => r.confidence !== "high") && (
					<div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
						<span className="flex items-center gap-1.5">
							<span className="inline-block h-2 w-2 rounded-full bg-green-500" />
							Høy sikkerhet
						</span>
						<span className="flex items-center gap-1.5">
							<span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
							Middels sikkerhet
						</span>
						<span className="flex items-center gap-1.5">
							<span className="inline-block h-2 w-2 rounded-full bg-red-400" />
							Lav sikkerhet — sjekk nøye
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
