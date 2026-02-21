"use client";

import { useState } from "react";
import { type Category, CsvImport } from "./csv-import";
import { DocumentUpload } from "./document-upload";

type Tab = "csv" | "document";

interface ImportTabsProps {
	categories: Category[];
}

export function ImportTabs({ categories }: ImportTabsProps) {
	const [activeTab, setActiveTab] = useState<Tab>("csv");

	return (
		<div className="p-8">
			<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
				Importer
			</h2>
			<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Last opp transaksjoner fra din bank — som CSV-fil, kvittering eller
				PDF-kontoutskrift.
			</p>

			{/* ── Tab switcher ─────────────────────────────────────────── */}
			<div className="mt-6 flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 w-fit dark:border-gray-700 dark:bg-gray-800">
				<button
					type="button"
					onClick={() => setActiveTab("csv")}
					className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
						activeTab === "csv"
							? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
							: "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
					}`}
				>
					CSV-fil
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("document")}
					className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
						activeTab === "document"
							? "bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white"
							: "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
					}`}
				>
					Kvittering / PDF
				</button>
			</div>

			{/* ── Tab content ──────────────────────────────────────────── */}
			{activeTab === "csv" ? (
				<CsvImportInner categories={categories} />
			) : (
				<DocumentUpload categories={categories} />
			)}
		</div>
	);
}

// Wrap CsvImport to strip the outer padding/heading (already rendered above)
function CsvImportInner({ categories }: { categories: Category[] }) {
	return <CsvImport categories={categories} headingHidden />;
}
