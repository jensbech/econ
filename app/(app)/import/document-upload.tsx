"use client";

import { AlertCircle, Loader2, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import type { SupportedMediaType } from "@/lib/ai-extract";
import { useUploadThing } from "@/lib/uploadthing";
import { type EnrichedTransaction, startAiExtraction } from "./ai-actions";
import { AiReview } from "./ai-review";
import type { Category } from "./csv-import";

// ─── Types ────────────────────────────────────────────────────────────────────

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
	transactions: EnrichedTransaction[];
}

const INITIAL_STATE: UploadState = {
	step: "idle",
	filename: null,
	errorMessage: null,
};

const ACCEPTED_MIME: Record<string, string[]> = {
	"application/pdf": [".pdf"],
	"image/jpeg": [".jpg", ".jpeg"],
	"image/png": [".png"],
	"image/webp": [".webp"],
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

function getFileType(file: File): "image" | "pdf" {
	return file.type === "application/pdf" ? "pdf" : "image";
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

interface UploadZoneProps {
	accounts?: Array<{ id: string; accountNumber: string | null }>;
	onExtracted: (
		fileUrl: string,
		fileType: "image" | "pdf",
		filename: string,
		transactions: EnrichedTransaction[],
	) => void;
}

function UploadZone({ accounts = [], onExtracted }: UploadZoneProps) {
	const [state, setState] = useState<UploadState>(INITIAL_STATE);
	const pendingRef = useRef<{ file: File; dataUrl: string } | null>(null);
	const accountsRef = useRef(accounts);
	accountsRef.current = accounts;

	const { startUpload } = useUploadThing("aiDocument", {
		onClientUploadComplete: async (res) => {
			const uploaded = res[0];
			const pending = pendingRef.current;
			if (!uploaded || !pending) return;
			const mediaType = pending.file.type as SupportedMediaType;
			const fileType = getFileType(pending.file);
			try {
				const result = await startAiExtraction(
					uploaded.url,
					mediaType,
					accountsRef.current,
				);
				if (result.success) {
					onExtracted(pending.dataUrl, fileType, pending.file.name, result.transactions);
				} else {
					setState((s) => ({ ...s, step: "error", errorMessage: result.error }));
				}
			} catch {
				setState((s) => ({
					...s,
					step: "error",
					errorMessage: "Klarte ikke starte AI-analyse.",
				}));
			}
		},
		onUploadError: (err) => {
			setState((s) => ({
				...s,
				step: "error",
				errorMessage: err.message || "Opplasting mislyktes.",
			}));
		},
	});

	const onDrop = useCallback(
		async (accepted: File[]) => {
			const file = accepted[0];
			if (!file) return;
			if (file.type !== "application/pdf" && file.size > 5 * 1024 * 1024) {
				setState((s) => ({
					...s,
					errorMessage: "Bilder kan maks være 5 MB.",
				}));
				return;
			}
			setState({ step: "extracting", filename: file.name, errorMessage: null });
			const base64 = await readFileAsBase64(file);
			pendingRef.current = { file, dataUrl: `data:${file.type};base64,${base64}` };
			await startUpload([file]);
		},
		[startUpload],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: ACCEPTED_MIME,
		maxFiles: 1,
		maxSize: 16 * 1024 * 1024,
		disabled: state.step === "extracting",
		onDropRejected: (files) => {
			const code = files[0]?.errors[0]?.code;
			setState((s) => ({
				...s,
				errorMessage:
					code === "file-too-large"
						? "Filen er for stor. Maks 16 MB for PDF, 5 MB for bilde."
						: "Kun PDF, JPG, PNG og WEBP er støttet.",
			}));
		},
	});

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
					onClick={() => setState(INITIAL_STATE)}
					className="mt-4 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
				>
					Prøv igjen
				</Button>
			</div>
		);
	}

	return (
		<div>
			{state.errorMessage && (
				<div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
					<AlertCircle className="h-3.5 w-3.5 shrink-0" />
					{state.errorMessage}
				</div>
			)}
			<div
				{...getRootProps()}
				className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors ${
					isDragActive
						? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/30"
						: "border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-700"
				}`}
			>
				<input {...getInputProps()} />
				<Upload
					className={`mb-4 h-10 w-10 ${isDragActive ? "text-indigo-500" : "text-gray-400"}`}
				/>
				{isDragActive ? (
					<p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
						Slipp filen her…
					</p>
				) : (
					<>
						<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Dra og slipp et dokument her
						</p>
						<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
							eller klikk for å velge fil
						</p>
						<p className="mt-4 text-xs text-gray-400 dark:text-gray-600">
							PDF, JPG, PNG, WEBP — Claude trekker ut transaksjoner automatisk
						</p>
					</>
				)}
			</div>
		</div>
	);
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface LoanOption {
	id: string;
	name: string;
}

interface AccountOption {
	id: string;
	name: string;
	accountNumber: string | null;
}

interface DocumentUploadProps {
	categories: Category[];
	accountId?: string;
	accounts?: AccountOption[];
	scope?: "household" | "personal";
	loans?: LoanOption[];
}

export function DocumentUpload({
	categories,
	accountId,
	accounts = [],
	scope = "household",
	loans = [],
}: DocumentUploadProps) {
	const [reviewState, setReviewState] = useState<ReviewState | null>(null);

	function handleExtracted(
		fileUrl: string,
		fileType: "image" | "pdf",
		filename: string,
		transactions: EnrichedTransaction[],
	) {
		setReviewState({ fileUrl, fileType, filename, transactions });
	}

	if (reviewState) {
		return (
			<div className="mt-8">
				<AiReview
					fileUrl={reviewState.fileUrl}
					fileType={reviewState.fileType}
					filename={reviewState.filename}
					transactions={reviewState.transactions}
					categories={categories}
					onDiscard={() => setReviewState(null)}
					accountId={accountId}
					accounts={accounts}
					scope={scope}
					loans={loans}
				/>
			</div>
		);
	}

	return (
		<div className="mt-8 max-w-xl">
			<UploadZone accounts={accounts} onExtracted={handleExtracted} />
		</div>
	);
}
