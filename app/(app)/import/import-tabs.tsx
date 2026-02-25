"use client";

import { Landmark } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { type Category, CsvImport } from "./csv-import";
import { DocumentUpload } from "./document-upload";

type Tab = "csv" | "document";

interface AccountOption {
	id: string;
	name: string;
	accountNumber: string | null;
	type: string;
}

interface LoanOption {
	id: string;
	name: string;
}

interface ImportTabsProps {
	categories: Category[];
	accounts: AccountOption[];
	loans?: LoanOption[];
}

export function ImportTabs({
	categories,
	accounts,
	loans = [],
}: ImportTabsProps) {
	const [activeTab, setActiveTab] = useState<Tab>("document");
	const [selectedAccountId, setSelectedAccountId] = useState<string>(
		accounts[0]?.id ?? "",
	);

	return (
		<div className="px-4 py-6 sm:p-8">
			<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
				Importer
			</h2>
			<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Last opp transaksjoner fra din bank — som CSV-fil, kvittering eller
				PDF-kontoutskrift.
			</p>

			{/* Account selector */}
			{accounts.length === 0 ? (
				<div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
					<Landmark className="h-4 w-4 shrink-0" />
					<span>
						Du må ha en konto for å importere.{" "}
						<Link href="/accounts" className="underline hover:no-underline">
							Opprett en konto &rarr;
						</Link>
					</span>
				</div>
			) : (
				<div className="mt-4 flex items-center gap-3">
					<label
						htmlFor="importAccount"
						className="text-sm font-medium text-gray-700 dark:text-gray-300"
					>
						Konto:
					</label>
					<select
						id="importAccount"
						value={selectedAccountId}
						onChange={(e) => setSelectedAccountId(e.target.value)}
						className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
					>
						{accounts.map((a) => (
							<option key={a.id} value={a.id}>
								{a.name} {a.type === "private" ? "(Privat)" : ""}
							</option>
						))}
					</select>
				</div>
			)}

			{/* Tab switcher */}
			<div className="mt-6 flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 w-fit dark:border-gray-700 dark:bg-gray-800">
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
			</div>

			{/* Tab content */}
			{accounts.length > 0 &&
				(activeTab === "csv" ? (
					<CsvImport
						categories={categories}
						headingHidden
						accountId={selectedAccountId}
						accounts={accounts}
						loans={loans}
					/>
				) : (
					<DocumentUpload
						categories={categories}
						accountId={selectedAccountId}
						accounts={accounts}
						loans={loans}
					/>
				))}
		</div>
	);
}
