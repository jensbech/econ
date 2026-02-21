"use client";

import { AlertCircle, FileText, Image, Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import type { ExtractedTransaction, SupportedMediaType } from "@/lib/ai-extract";
import { startAiExtraction } from "./ai-actions";
import { AiReview } from "./ai-review";
import type { Category } from "./csv-import";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadKind = "receipt" | "statement";
type UploadStep = "idle" | "extracting" | "error";

interface UploadState {
	step: UploadStep;
	filename: string | null;
	errorMessage: string | null;
}

interface ReviewState {
	fileUrl: string;
	fileType: "image" | "pdf";
	filename: string;
	transactions: ExtractedTransaction[];
}

const INITIAL_STATE: UploadState = {
	step: "idle",
	filename: null,
	errorMessage: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFileAsBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const dataUrl = e.target?.result as string;
			resolve(dataUrl.split(",")[1]);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

// ─── Single upload zone ───────────────────────────────────────────────────────

interface UploadZoneProps {
	kind: UploadKind;
	onExtracted: (
		fileUrl: string,
		fileType: "image" | "pdf",
		filename: string,
		transactions: ExtractedTransaction[],
	) => void;
}

function UploadZone({ kind, onExtracted }: UploadZoneProps) {
	const [state, setState] = useState<UploadState>(INITIAL_STATE);

	const isReceipt = kind === "receipt";
	const label = isReceipt ? "Kvittering" : "Kontoutskrift (PDF)";
	const Icon = isReceipt ? Image : FileText;
	const acceptedFormats = isReceipt
		? "JPG, PNG, WEBP — maks 4 MB"
		: "PDF — maks 16 MB";
	const acceptMime: Record<string, string[]> = isReceipt
		? {
				"image/jpeg": [".jpg", ".jpeg"],
				"image/png": [".png"],
				"image/webp": [".webp"],
			}
		: { "application/pdf": [".pdf"] };

	const fileType: "image" | "pdf" = isReceipt ? "image" : "pdf";

	const onDrop = useCallback(
		async (accepted: File[]) => {
			const file = accepted[0];
			if (!file) return;
			setState({ step: "extracting", filename: file.name, errorMessage: null });
			try {
				const base64 = await readFileAsBase64(file);
				const mediaType = file.type as SupportedMediaType;
				const result = await startAiExtraction(base64, mediaType);
				if (result.success) {
					const dataUrl = `data:${file.type};base64,${base64}`;
					onExtracted(dataUrl, fileType, file.name, result.transactions);
				} else {
					setState((s) => ({
						...s,
						step: "error",
						errorMessage: result.error,
					}));
				}
			} catch {
				setState((s) => ({
					...s,
					step: "error",
					errorMessage: "Klarte ikke starte AI-analyse.",
				}));
			}
		},
		[fileType, onExtracted],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: acceptMime,
		maxFiles: 1,
		disabled: state.step === "extracting",
		onDropRejected: () =>
			setState((s) => ({
				...s,
				errorMessage: `Kun ${acceptedFormats.split("—")[0].trim()} er støttet.`,
			})),
	});

	function reset() {
		setState(INITIAL_STATE);
	}

	// ── Extracting: spinner ───────────────────────────────────────────────

	if (state.step === "extracting") {
		return (
			<div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-6 text-sm text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-300">
				<Loader2 className="h-5 w-5 shrink-0 animate-spin" />
				<div>
					<p className="font-medium">Claude analyserer dokumentet…</p>
					<p className="mt-0.5 text-xs text-indigo-500 dark:text-indigo-400">
						{state.filename}
					</p>
				</div>
			</div>
		);
	}

	// ── Error ─────────────────────────────────────────────────────────────

	if (state.step === "error") {
		return (
			<div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-900/20">
				<div className="flex items-start gap-3">
					<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
					<p className="text-sm text-red-700 dark:text-red-400">
						{state.errorMessage ?? "Noe gikk galt."}
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={reset}
					className="mt-4 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
				>
					Prøv igjen
				</Button>
			</div>
		);
	}

	// ── Idle: dropzone ────────────────────────────────────────────────────

	return (
		<div>
			{state.errorMessage && state.step === "idle" && (
				<div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
					<AlertCircle className="h-3.5 w-3.5 shrink-0" />
					{state.errorMessage}
				</div>
			)}
			<div
				{...getRootProps()}
				className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
					isDragActive
						? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/30"
						: "border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-700"
				}`}
			>
				<input {...getInputProps()} />
				<Icon
					className={`mb-3 h-8 w-8 ${isDragActive ? "text-indigo-500" : "text-gray-400"}`}
				/>
				<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
					{label}
				</p>
				{isDragActive ? (
					<p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
						Slipp filen her…
					</p>
				) : (
					<>
						<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Dra og slipp, eller klikk for å velge
						</p>
						<p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
							{acceptedFormats}
						</p>
					</>
				)}
			</div>
		</div>
	);
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface DocumentUploadProps {
	categories: Category[];
}

export function DocumentUpload({ categories }: DocumentUploadProps) {
	const [reviewState, setReviewState] = useState<ReviewState | null>(null);

	function handleExtracted(
		fileUrl: string,
		fileType: "image" | "pdf",
		filename: string,
		transactions: ExtractedTransaction[],
	) {
		setReviewState({ fileUrl, fileType, filename, transactions });
	}

	function handleDiscard() {
		setReviewState(null);
	}

	// ── Review mode ───────────────────────────────────────────────────────

	if (reviewState) {
		return (
			<div className="mt-8">
				<AiReview
					fileUrl={reviewState.fileUrl}
					fileType={reviewState.fileType}
					filename={reviewState.filename}
					transactions={reviewState.transactions}
					categories={categories}
					onDiscard={handleDiscard}
				/>
			</div>
		);
	}

	// ── Upload mode ───────────────────────────────────────────────────────

	return (
		<div className="mt-8 max-w-2xl space-y-8">
			<div>
				<p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
					Last opp kvittering
				</p>
				<p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
					Bilde av en kvittering — Claude tolker og trekker ut transaksjonsdata.
				</p>
				<UploadZone kind="receipt" onExtracted={handleExtracted} />
			</div>

			<div>
				<p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
					Last opp kontoutskrift
				</p>
				<p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
					PDF-kontoutskrift fra din bank — Claude trekker ut alle transaksjoner.
				</p>
				<UploadZone kind="statement" onExtracted={handleExtracted} />
			</div>

			<div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400">
				<Upload className="mt-0.5 h-4 w-4 shrink-0" />
				<p>
					Claude AI analyserer dokumentet direkte og trekker ut transaksjoner
					for gjennomgang før lagring.
				</p>
			</div>
		</div>
	);
}
