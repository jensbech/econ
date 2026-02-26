"use client";

import {
	AlertCircle,
	CheckCircle,
	ChevronRight,
	Loader2,
	Undo2,
	Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { type CsvDetectionResult, detectCsvFormat } from "@/lib/csv-detect";
import {
	checkDuplicates,
	confirmImport,
	type ImportRow,
	rollbackImport,
} from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "idle" | "mapping" | "checking" | "preview" | "importing" | "done";

export interface Category {
	id: string;
	name: string;
}

interface ParsedFile {
	filename: string;
	headers: string[];
	rows: Record<string, string>[];
	detection: CsvDetectionResult;
}

interface ColumnMapping {
	date: string;
	amount: string;
	description: string;
}

export interface MappedRow {
	date: string;
	amount: string;
	description: string;
}

// ─── Category suggestion ──────────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
	"Mat & dagligvarer": [
		"rema",
		"kiwi",
		"meny",
		"coop",
		"bunnpris",
		"spar",
		"ica",
		"bama",
		"extra",
		"mat",
		"dagligvarer",
		"grocery",
		"nille",
		"joker",
	],
	Transport: [
		"transport",
		"buss",
		"tog",
		"nsb",
		" vy ",
		"ruter",
		"taxi",
		"uber",
		"drivstoff",
		"bensin",
		"diesel",
		"esso",
		"circle k",
		"shell",
		"st1",
		"parkering",
		"autopass",
		"atb",
		"kolumbus",
		"brakar",
		"skyss",
	],
	Bolig: [
		"bolig",
		"husleie",
		"strøm",
		"tibber",
		"hafslund",
		"fjordkraft",
		"kommunale",
		"felleskostnader",
	],
	"Helse & apotek": [
		"apotek",
		"lege",
		"tannlege",
		"klinikk",
		"boots",
		"vitusapotek",
	],
	"Klær & sko": ["klær", "sko", "zara", "h&m", "cubus", "intersport", "varner"],
	Underholdning: [
		"kino",
		"netflix",
		"spotify",
		"disney",
		"viaplay",
		"hbo",
		"steam",
		"playstation",
		"xbox",
		"nintendo",
	],
	"Restaurant & kafé": [
		"restaurant",
		"kafé",
		"mcdonalds",
		"burger",
		"pizza",
		"cafe",
		"7-eleven",
		"narvesen",
		"kafe",
		"pizzabakeren",
		"dominos",
		"starbucks",
		"waynes",
		"egon",
		"peppes",
		"sushi",
	],
	Abonnementer: [
		"abonnement",
		"subscription",
		"telia",
		"telenor",
		"chess",
		"onecall",
	],
	Reise: [
		"reise",
		"fly",
		"sas",
		"norwegian",
		"wideroe",
		"airbnb",
		"hotell",
		"booking",
		"lufthavn",
		"flyplass",
	],
	Barn: ["barnehage", "foreldrebetaling", "sfo"],
	Sparing: ["sparing", "spareavtale"],
};

function suggestCategory(
	description: string,
	availableCategories: Category[],
): string | null {
	const lower = description.toLowerCase();

	for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
		if (keywords.some((kw) => lower.includes(kw))) {
			const match = availableCategories.find((c) => c.name === catName);
			if (match) return match.id;
		}
	}

	// Fallback: substring match on category name tokens
	for (const cat of availableCategories) {
		if (cat.name === "Annet") continue;
		const parts = cat.name.toLowerCase().split(/[\s&,/]+/);
		if (parts.some((p) => p.length > 3 && lower.includes(p))) {
			return cat.id;
		}
	}

	// Default to "Annet"
	const annet = availableCategories.find((c) => c.name === "Annet");
	return annet?.id ?? null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function guessBestColumn(
	headers: string[],
	field: "date" | "amount" | "description",
): string {
	const lower = headers.map((h) => h.toLowerCase().trim());
	const keywords: Record<"date" | "amount" | "description", string[]> = {
		date: ["dato", "date", "bokf", "registrert", "tid"],
		amount: ["beløp", "belop", "amount", "sum", "nok", "kr"],
		description: [
			"tekst",
			"beskrivelse",
			"description",
			"forklaring",
			"tittel",
			"title",
			"navn",
			"mottaker",
			"avsender",
		],
	};
	for (const kw of keywords[field]) {
		const idx = lower.findIndex((h) => h.includes(kw));
		if (idx >= 0) return headers[idx];
	}
	return headers[0] ?? "";
}

function bankLabel(bank: CsvDetectionResult["bankHint"]): string {
	const labels: Record<string, string> = {
		dnb: "DNB",
		nordea: "Nordea",
		sparebank1: "Sparebank 1",
		unknown: "Ukjent bank",
	};
	return labels[bank ?? "unknown"] ?? "Ukjent bank";
}

function delimLabel(d: string): string {
	if (d === ";") return "Semikolon (;)";
	if (d === ",") return "Komma (,)";
	if (d === "\t") return "Tab (⇥)";
	return d;
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface LoanOption {
	id: string;
	name: string;
}

interface AccountOption {
	id: string;
	name: string;
}

interface CsvImportProps {
	categories: Category[];
	headingHidden?: boolean;
	accountId?: string;
	accounts?: AccountOption[];
	loans?: LoanOption[];
}

export function CsvImport({ categories, headingHidden, accountId, accounts = [], loans = [] }: CsvImportProps) {
	const router = useRouter();
	const [step, setStep] = useState<Step>("idle");
	const [error, setError] = useState<string | null>(null);
	const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
	const [mapping, setMapping] = useState<ColumnMapping>({
		date: "",
		amount: "",
		description: "",
	});
	const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
	const [duplicateFlags, setDuplicateFlags] = useState<boolean[]>([]);
	const [skipped, setSkipped] = useState<Set<number>>(new Set());
	const [rowCategories, setRowCategories] = useState<(string | null)[]>([]);
	const [rowAccountIds, setRowAccountIds] = useState<(string | null)[]>([]);
	const [rowLoanIds, setRowLoanIds] = useState<(string | null)[]>([]);
	const [importResult, setImportResult] = useState<{
		batchId: string;
		inserted: number;
	} | null>(null);
	const [isRollingBack, setIsRollingBack] = useState(false);

	// ── Drop handler ─────────────────────────────────────────────────────────

	const onDrop = useCallback((accepted: File[]) => {
		const file = accepted[0];
		if (!file) return;
		setError(null);

		const reader = new FileReader();
		reader.onload = (e) => {
			const raw = e.target?.result as string;
			if (!raw) {
				setError("Kunne ikke lese filen.");
				return;
			}

			const detection = detectCsvFormat(raw);

			const result = Papa.parse<Record<string, string>>(raw, {
				header: true,
				delimiter: detection.delimiter,
				skipEmptyLines: true,
				transformHeader: (h: string) => h.replace(/^"|"$/g, "").trim(),
			});

			if (result.errors.length > 0 && result.data.length === 0) {
				setError(
					`CSV-parsing feilet: ${result.errors[0]?.message ?? "Ukjent feil"}`,
				);
				return;
			}

			const headers = result.meta.fields ?? [];
			if (headers.length === 0) {
				setError("Fant ingen kolonner i filen.");
				return;
			}

			const parsed: ParsedFile = {
				filename: file.name,
				headers,
				rows: result.data,
				detection,
			};

			const initialMapping: ColumnMapping = {
				date: guessBestColumn(headers, "date"),
				amount: guessBestColumn(headers, "amount"),
				description: guessBestColumn(headers, "description"),
			};

			setParsedFile(parsed);
			setMapping(initialMapping);
			setStep("mapping");
		};

		reader.readAsText(file);
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { "text/csv": [".csv"], "text/plain": [".txt", ".csv"] },
		maxFiles: 1,
		onDropRejected: () => setError("Kun CSV-filer er støttet."),
	});

	// ── Confirm mapping ──────────────────────────────────────────────────────

	async function confirmMapping() {
		if (!parsedFile) return;
		const rows = parsedFile.rows.map((row) => ({
			date: row[mapping.date] ?? "",
			amount: row[mapping.amount] ?? "",
			description: row[mapping.description] ?? "",
		}));
		setMappedRows(rows);
		setStep("checking");
		try {
			const flags = await checkDuplicates(
				rows,
				parsedFile.detection.decimalSeparator,
			);
			setDuplicateFlags(flags);
			// Pre-check "skip" for all detected duplicates
			setSkipped(new Set(flags.flatMap((isDup, i) => (isDup ? [i] : []))));
		} catch {
			// If the duplicate check fails, proceed without flagging
			setDuplicateFlags(rows.map(() => false));
			setSkipped(new Set());
		}
		// Suggest a category for each row based on description keywords
		setRowCategories(
			rows.map((r) => suggestCategory(r.description, categories)),
		);
		setRowAccountIds(rows.map(() => accountId ?? null));
		setRowLoanIds(rows.map(() => null));
		setStep("preview");
	}

	// ── Confirm import ───────────────────────────────────────────────────────

	async function handleConfirmImport() {
		if (!parsedFile) return;
		setStep("importing");

		const toImport: ImportRow[] = [];
		for (let i = 0; i < mappedRows.length; i++) {
			if (!skipped.has(i)) {
				toImport.push({
					date: mappedRows[i].date,
					amount: mappedRows[i].amount,
					description: mappedRows[i].description,
					categoryId: rowCategories[i] ?? null,
					accountId: rowAccountIds[i] ?? null,
					loanId: rowLoanIds[i] ?? null,
				});
			}
		}

		try {
			const result = await confirmImport(
				parsedFile.filename,
				toImport,
				parsedFile.detection.decimalSeparator,
				accountId ?? null,
			);
			setImportResult(result);
			setStep("done");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Importering feilet. Prøv igjen.",
			);
			setStep("preview");
		}
	}

	// ── Rollback ─────────────────────────────────────────────────────────────

	async function handleRollback() {
		if (!importResult?.batchId || isRollingBack) return;
		setIsRollingBack(true);
		try {
			await rollbackImport(importResult.batchId);
			router.refresh();
			reset();
		} catch {
			setError("Angring feilet. Prøv igjen.");
			setIsRollingBack(false);
		}
	}

	// ── Reset ────────────────────────────────────────────────────────────────

	function reset() {
		setStep("idle");
		setParsedFile(null);
		setMappedRows([]);
		setDuplicateFlags([]);
		setSkipped(new Set());
		setRowCategories([]);
		setRowAccountIds([]);
		setRowLoanIds([]);
		setImportResult(null);
		setIsRollingBack(false);
		setError(null);
	}

	const nonSkippedCount = mappedRows.length - skipped.size;

	// ─────────────────────────────────────────────────────────────────────────

	return (
		<div className={headingHidden ? undefined : "p-8"}>
			{!headingHidden && (
				<>
					<h2 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
						Importer
					</h2>
					<p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
						Last opp en CSV-fil fra din bank for å importere transaksjoner.
					</p>
				</>
			)}

			{error && (
				<div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
					<AlertCircle className="h-4 w-4 shrink-0" />
					{error}
				</div>
			)}

			{/* ── Idle: dropzone ─────────────────────────────────────────── */}
			{step === "idle" && (
				<div className="mt-8 max-w-xl">
					<div
						{...getRootProps()}
						className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-16 text-center transition-colors ${
							isDragActive
								? "border-indigo-400 bg-primary/8 dark:border-indigo-600 dark:bg-indigo-950/30"
								: "border-border bg-card hover:border-indigo-300 hover:bg-primary/8/30 dark:border-border/40 dark:bg-card dark:hover:border-indigo-700"
						}`}
					>
						<input {...getInputProps()} />
						<Upload
							className={`mb-4 h-10 w-10 ${isDragActive ? "text-primary" : "text-foreground/50"}`}
						/>
						{isDragActive ? (
							<p className="text-sm font-medium text-primary dark:text-indigo-400">
								Slipp filen her…
							</p>
						) : (
							<>
								<p className="text-sm font-medium text-foreground/80 dark:text-foreground/80">
									Dra og slipp en CSV-fil her
								</p>
								<p className="mt-1 text-xs text-foreground/60 dark:text-foreground/50">
									eller klikk for å velge fil
								</p>
								<p className="mt-4 text-xs text-foreground/50 dark:text-foreground/70">
									Støttede formater: DNB, Nordea, Sparebank 1
								</p>
							</>
						)}
					</div>
				</div>
			)}

			{/* ── Checking duplicates: spinner ────────────────────────────── */}
			{step === "checking" && (
				<div className="mt-8 flex items-center gap-3 text-sm text-foreground/70 dark:text-foreground/50">
					<Loader2 className="h-4 w-4 animate-spin text-primary" />
					Sjekker for duplikater…
				</div>
			)}

			{/* ── Importing: spinner ──────────────────────────────────────── */}
			{step === "importing" && (
				<div className="mt-8 flex items-center gap-3 text-sm text-foreground/70 dark:text-foreground/50">
					<Loader2 className="h-4 w-4 animate-spin text-primary" />
					Importerer {nonSkippedCount} rader…
				</div>
			)}

			{/* ── Done: success ───────────────────────────────────────────── */}
			{step === "done" && importResult && (
				<div className="mt-8 max-w-xl space-y-4">
					<div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
						<CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
						<div>
							<p className="text-sm font-medium">
								{importResult.inserted} utgifter importert
							</p>
							<p className="mt-0.5 font-mono text-xs text-green-600 dark:text-green-500">
								Batch: {importResult.batchId}
							</p>
						</div>
					</div>

					<div className="flex flex-wrap gap-3">
						<Link href={`/expenses?importBatch=${importResult.batchId}`}>
							<Button className="bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8">
								Se importerte utgifter
							</Button>
						</Link>
						<Button
							variant="outline"
							onClick={handleRollback}
							disabled={isRollingBack}
							className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
						>
							{isRollingBack ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Undo2 className="mr-2 h-4 w-4" />
							)}
							Angre import
						</Button>
						<Button variant="outline" onClick={reset}>
							Importer ny fil
						</Button>
					</div>
				</div>
			)}

			{/* ── Preview: full table with category editing ───────────────── */}
			{step === "preview" && parsedFile && (
				<div className="mt-8 max-w-6xl space-y-6">
					<DuplicateSummary
						total={mappedRows.length}
						duplicateCount={duplicateFlags.filter(Boolean).length}
					/>

					<MappedPreview
						rows={mappedRows}
						duplicateFlags={duplicateFlags}
						skipped={skipped}
						onToggleSkip={(i) =>
							setSkipped((prev) => {
								const next = new Set(prev);
								if (next.has(i)) next.delete(i);
								else next.add(i);
								return next;
							})
						}
						categories={categories}
						rowCategories={rowCategories}
						onCategoryChange={(i, catId) =>
							setRowCategories((prev) => {
								const next = [...prev];
								next[i] = catId;
								return next;
							})
						}
						accounts={accounts}
						rowAccountIds={rowAccountIds}
						onAccountChange={(i, accId) =>
							setRowAccountIds((prev) => {
								const next = [...prev];
								next[i] = accId;
								return next;
							})
						}
						loans={loans}
						rowLoanIds={rowLoanIds}
						onLoanChange={(i, lId) =>
							setRowLoanIds((prev) => {
								const next = [...prev];
								next[i] = lId;
								return next;
							})
						}
					/>

					<div className="flex flex-wrap gap-3">
						<Button
							onClick={handleConfirmImport}
							disabled={nonSkippedCount === 0}
							className="bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
						>
							<CheckCircle className="mr-2 h-4 w-4" />
							Bekreft import ({nonSkippedCount} rader)
						</Button>
						<Button variant="outline" onClick={reset}>
							Avbryt
						</Button>
					</div>
				</div>
			)}

			{/* ── Mapping dialog ─────────────────────────────────────────────── */}
			{parsedFile && (
				<MappingDialog
					open={step === "mapping"}
					parsedFile={parsedFile}
					mapping={mapping}
					onMappingChange={setMapping}
					onConfirm={confirmMapping}
					onCancel={reset}
				/>
			)}
		</div>
	);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MappingDialogProps {
	open: boolean;
	parsedFile: ParsedFile;
	mapping: ColumnMapping;
	onMappingChange: (m: ColumnMapping) => void;
	onConfirm: () => void | Promise<void>;
	onCancel: () => void;
}

function MappingDialog({
	open,
	parsedFile,
	mapping,
	onMappingChange,
	onConfirm,
	onCancel,
}: MappingDialogProps) {
	const { headers, detection, filename, rows } = parsedFile;
	const isValid =
		mapping.date !== "" && mapping.amount !== "" && mapping.description !== "";

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Tilordne kolonner</DialogTitle>
					<DialogDescription>
						Velg hvilke kolonner som tilsvarer dato, beløp og beskrivelse.
					</DialogDescription>
				</DialogHeader>

				{/* ── Format detection summary ─────────────────────────────── */}
				<div className="rounded-lg border border-border bg-background p-4 dark:border-border/40 dark:bg-card/50">
					<p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/60 dark:text-foreground/50">
						Detektert format
					</p>
					<div className="flex flex-wrap gap-2">
						<FormatChip label="Fil" value={filename} />
						{detection.bankHint && detection.bankHint !== "unknown" && (
							<FormatChip label="Bank" value={bankLabel(detection.bankHint)} />
						)}
						<FormatChip
							label="Skilletegn"
							value={delimLabel(detection.delimiter)}
						/>
						<FormatChip label="Datoformat" value={detection.dateFormat} />
						<FormatChip
							label="Desimaltegn"
							value={detection.decimalSeparator}
						/>
						<FormatChip label="Rader" value={String(rows.length)} />
						{!detection.confident && (
							<span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
								<AlertCircle className="h-3 w-3" />
								Usikker deteksjon
							</span>
						)}
					</div>
				</div>

				{/* ── Column mapping selects ────────────────────────────────── */}
				<div className="space-y-4">
					<MappingSelect
						id="map-date"
						label="Datokolonne"
						value={mapping.date}
						headers={headers}
						onChange={(v) => onMappingChange({ ...mapping, date: v })}
					/>
					<MappingSelect
						id="map-amount"
						label="Beløpskolonne"
						value={mapping.amount}
						headers={headers}
						onChange={(v) => onMappingChange({ ...mapping, amount: v })}
					/>
					<MappingSelect
						id="map-description"
						label="Beskrivelseskolonne"
						value={mapping.description}
						headers={headers}
						onChange={(v) => onMappingChange({ ...mapping, description: v })}
					/>
				</div>

				{/* ── Sample preview ────────────────────────────────────────── */}
				<SamplePreview rows={rows} mapping={mapping} />

				<DialogFooter>
					<Button variant="outline" onClick={onCancel}>
						Avbryt
					</Button>
					<Button
						onClick={onConfirm}
						disabled={!isValid}
						className="bg-card hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-primary/8"
					>
						Bekreft tilordning
						<ChevronRight className="ml-1 h-4 w-4" />
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ─── MappingSelect ────────────────────────────────────────────────────────────

interface MappingSelectProps {
	id: string;
	label: string;
	value: string;
	headers: string[];
	onChange: (v: string) => void;
}

function MappingSelect({
	id,
	label,
	value,
	headers,
	onChange,
}: MappingSelectProps) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id}>{label}</Label>
			<Select value={value} onValueChange={onChange}>
				<SelectTrigger id={id} className="w-full">
					<SelectValue placeholder="Velg kolonne…" />
				</SelectTrigger>
				<SelectContent>
					{headers.map((h) => (
						<SelectItem key={h} value={h}>
							{h}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

// ─── FormatChip ───────────────────────────────────────────────────────────────

interface FormatChipProps {
	label: string;
	value: string;
}

function FormatChip({ label, value }: FormatChipProps) {
	return (
		<div className="flex max-w-[200px] items-center gap-1 truncate rounded border border-border bg-card px-2 py-1 dark:border-border/40 dark:bg-card">
			<span className="shrink-0 text-xs text-foreground/60 dark:text-foreground/50">
				{label}:
			</span>
			<span className="truncate text-xs font-medium text-foreground dark:text-card-foreground">
				{value}
			</span>
		</div>
	);
}

// ─── SamplePreview ────────────────────────────────────────────────────────────

const MAPPING_FIELDS: { key: keyof ColumnMapping; label: string }[] = [
	{ key: "date", label: "Dato" },
	{ key: "amount", label: "Beløp" },
	{ key: "description", label: "Beskrivelse" },
];

interface SamplePreviewProps {
	rows: Record<string, string>[];
	mapping: ColumnMapping;
}

function SamplePreview({ rows, mapping }: SamplePreviewProps) {
	const sample = rows.slice(0, 3);
	return (
		<div>
			<p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/60 dark:text-foreground/50">
				Forhåndsvisning (3 rader)
			</p>
			<div className="overflow-x-auto rounded-lg border border-border dark:border-border/40">
				<table className="min-w-full text-xs">
					<thead className="bg-background dark:bg-card">
						<tr>
							{MAPPING_FIELDS.map(({ label }) => (
								<th
									key={label}
									className="px-3 py-2 text-left font-medium text-foreground/60 dark:text-foreground/50"
								>
									{label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-card dark:divide-gray-800 dark:bg-card">
						{sample.map((row, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: preview-only table, no CRUD
							<tr key={i}>
								{MAPPING_FIELDS.map(({ key }) => (
									<td
										key={key}
										className="max-w-[160px] truncate px-3 py-2 text-foreground/80 dark:text-foreground/80"
									>
										{mapping[key] ? (
											(row[mapping[key]] ?? "—")
										) : (
											<span className="italic text-foreground/50">ikke valgt</span>
										)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

// ─── DuplicateSummary ─────────────────────────────────────────────────────────

interface DuplicateSummaryProps {
	total: number;
	duplicateCount: number;
}

function DuplicateSummary({ total, duplicateCount }: DuplicateSummaryProps) {
	if (duplicateCount === 0) {
		return (
			<div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-400">
				<CheckCircle className="h-4 w-4 shrink-0" />
				<span>{total} rader klar til import — ingen duplikater funnet.</span>
			</div>
		);
	}
	return (
		<div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
			<AlertCircle className="h-4 w-4 shrink-0" />
			<span>
				{total} rader funnet — {duplicateCount} sannsynlige duplikat
				{duplicateCount !== 1 ? "er" : ""} er forhåndsmerket for å hoppes over.
			</span>
		</div>
	);
}

// ─── MappedPreview ────────────────────────────────────────────────────────────

interface MappedPreviewProps {
	rows: MappedRow[];
	duplicateFlags: boolean[];
	skipped: Set<number>;
	onToggleSkip: (index: number) => void;
	categories: Category[];
	rowCategories: (string | null)[];
	onCategoryChange: (index: number, categoryId: string | null) => void;
	accounts: AccountOption[];
	rowAccountIds: (string | null)[];
	onAccountChange: (index: number, accountId: string | null) => void;
	loans: LoanOption[];
	rowLoanIds: (string | null)[];
	onLoanChange: (index: number, id: string | null) => void;
}

function MappedPreview({
	rows,
	duplicateFlags,
	skipped,
	onToggleSkip,
	categories,
	rowCategories,
	onCategoryChange,
	accounts,
	rowAccountIds,
	onAccountChange,
	loans,
	rowLoanIds,
	onLoanChange,
}: MappedPreviewProps) {
	return (
		<div>
			<p className="mb-2 text-sm font-medium text-foreground/80 dark:text-foreground/80">
				Forhåndsvisning — {rows.length} rader totalt
			</p>
			<div className="overflow-x-auto rounded-lg border border-border dark:border-border/40">
				<table className="min-w-full text-sm">
					<thead className="bg-background dark:bg-card">
						<tr>
							<th className="px-3 py-2 text-left font-medium text-foreground/60 dark:text-foreground/50">
								Hopp over
							</th>
							<th className="px-4 py-2 text-left font-medium text-foreground/60 dark:text-foreground/50">
								Dato
							</th>
							<th className="px-4 py-2 text-left font-medium text-foreground/60 dark:text-foreground/50">
								Beløp
							</th>
							<th className="px-4 py-2 text-left font-medium text-foreground/60 dark:text-foreground/50">
								Beskrivelse
							</th>
							<th className="px-4 py-2 text-left font-medium text-foreground/60 dark:text-foreground/50">
								Konto
							</th>
							<th className="px-4 py-2 text-left font-medium text-foreground/60 dark:text-foreground/50">
								Kategori
							</th>
							<th className="px-4 py-2 text-left font-medium text-foreground/60 dark:text-foreground/50">
								Kobling
							</th>
							<th className="px-4 py-2 text-left font-medium text-foreground/60 dark:text-foreground/50">
								Status
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100 bg-card dark:divide-gray-800 dark:bg-card">
						{rows.map((row, i) => {
							const isDuplicate = duplicateFlags[i] ?? false;
							const isSkipped = skipped.has(i);
							const catId = rowCategories[i] ?? null;
							const catName = catId ? categories.find((c) => c.id === catId)?.name : null;
							const rowKey = `${row.date}|${row.amount}|${row.description}|${i}`;
							return (
								<tr
									key={rowKey}
									className={
										isDuplicate ? "bg-amber-50 dark:bg-amber-900/10" : undefined
									}
								>
									<td className="px-3 py-2 text-center">
										<input
											type="checkbox"
											checked={isSkipped}
											onChange={() => onToggleSkip(i)}
											className="h-4 w-4 rounded border-border accent-indigo-600"
											aria-label="Hopp over denne raden"
										/>
									</td>
									<td
										className={`whitespace-nowrap px-4 py-2 ${isSkipped ? "text-foreground/50 line-through" : "text-foreground/80 dark:text-foreground/80"}`}
									>
										{row.date || "—"}
									</td>
									<td
										className={`whitespace-nowrap px-4 py-2 ${isSkipped ? "text-foreground/50 line-through" : "text-foreground/80 dark:text-foreground/80"}`}
									>
										{row.amount || "—"}
									</td>
									<td
										className={`max-w-[200px] truncate px-4 py-2 ${isSkipped ? "text-foreground/50 line-through" : "text-foreground/80 dark:text-foreground/80"}`}
									>
										{row.description || "—"}
									</td>
									<td className="px-4 py-1.5">
										{!isSkipped && accounts.length > 0 && (
											<Select
												value={rowAccountIds[i] ?? "__none"}
												onValueChange={(v) =>
													onAccountChange(i, v === "__none" ? null : v)
												}
											>
												<SelectTrigger className="h-7 min-w-[130px] text-xs">
													<SelectValue placeholder="Konto…" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="__none">Ingen konto</SelectItem>
													{accounts.map((a) => (
														<SelectItem key={a.id} value={a.id}>
															{a.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									</td>
									<td className="px-4 py-1.5">
										{!isSkipped && (
											<Select
												value={catId ?? "__none"}
												onValueChange={(v) =>
													onCategoryChange(i, v === "__none" ? null : v)
												}
											>
												<SelectTrigger className="h-7 min-w-[150px] text-xs">
													<SelectValue placeholder="Velg kategori…" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="__none">Ingen kategori</SelectItem>
													{categories.map((cat) => (
														<SelectItem key={cat.id} value={cat.id}>
															{cat.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									</td>
									<td className="px-4 py-1.5">
										{!isSkipped && catName === "Lån" && loans.length > 0 && (
											<Select
												value={rowLoanIds[i] ?? "__none"}
												onValueChange={(v) =>
													onLoanChange(i, v === "__none" ? null : v)
												}
											>
												<SelectTrigger className="h-7 min-w-[130px] text-xs">
													<SelectValue placeholder="Lån…" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="__none">Ingen</SelectItem>
													{loans.map((l) => (
														<SelectItem key={l.id} value={l.id}>
															{l.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										)}
									</td>
									<td className="px-4 py-2">
										{isDuplicate && (
											<span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
												Duplikat
											</span>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
