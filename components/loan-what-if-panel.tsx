"use client";

import { addMonths, format } from "date-fns";
import { nb } from "date-fns/locale";
import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { formatNOK } from "@/lib/format";
import { computeEarlyPayoff } from "@/lib/loan-math";

interface LoanWhatIfPanelProps {
	currentBalanceOere: number;
	annualRatePct: number;
	monthlyPaymentOere: number;
}

export function LoanWhatIfPanel({
	currentBalanceOere,
	annualRatePct,
	monthlyPaymentOere,
}: LoanWhatIfPanelProps) {
	const [extraStr, setExtraStr] = useState("");
	const extraOere = Math.round((Number(extraStr) || 0) * 100);

	const result = useMemo(
		() =>
			computeEarlyPayoff(
				currentBalanceOere,
				annualRatePct,
				monthlyPaymentOere,
				extraOere,
			),
		[currentBalanceOere, annualRatePct, monthlyPaymentOere, extraOere],
	);

	const newPayoffDate =
		result && result.newMonths > 0
			? format(addMonths(new Date(), result.newMonths), "MMMM yyyy", {
					locale: nb,
				})
			: null;
	const regularPayoffDate =
		result && result.regularMonths > 0
			? format(addMonths(new Date(), result.regularMonths), "MMMM yyyy", {
					locale: nb,
				})
			: null;

	const hasSavings = extraOere > 0 && result !== null && result.monthsSaved > 0;

	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
			<div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
				<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
					Hva hvis jeg betaler ekstra?
				</h3>
			</div>
			<div className="p-5">
				<div className="mb-4 space-y-1.5">
					<label
						htmlFor="extra-payment"
						className="text-xs font-medium text-gray-500 dark:text-gray-400"
					>
						Ekstra månedlig betaling (NOK)
					</label>
					<input
						id="extra-payment"
						type="number"
						min={0}
						step={500}
						value={extraStr}
						onChange={(e) => setExtraStr(e.target.value)}
						placeholder="f.eks. 2000"
						className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
					/>
				</div>

				{result === null ? (
					<p className="text-xs text-gray-400 dark:text-gray-500">
						Beregning ikke tilgjengelig for dette lånet.
					</p>
				) : hasSavings ? (
					<>
						<div className="mb-3 flex justify-between text-sm">
							<span className="text-gray-500 dark:text-gray-400">Nedbetalt om</span>
							<span className="font-medium text-gray-900 dark:text-white">
								{result.newMonths} mnd{newPayoffDate ? ` (${newPayoffDate})` : ""}
							</span>
						</div>
						<div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/40 dark:bg-green-900/20">
							<div className="mb-2 flex items-center gap-1.5">
								<Sparkles className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
								<span className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
									Gevinst ved ekstra betaling
								</span>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div>
									<p className="text-xs text-green-700/70 dark:text-green-400/70">Tid spart</p>
									<p className="text-lg font-bold tabular-nums text-green-700 dark:text-green-400">
										{result.monthsSaved} mnd
									</p>
								</div>
								<div>
									<p className="text-xs text-green-700/70 dark:text-green-400/70">Renter spart</p>
									<p className="text-lg font-bold tabular-nums text-green-700 dark:text-green-400">
										{formatNOK(result.interestSavedOere)}
									</p>
								</div>
							</div>
						</div>
					</>
				) : (
					<dl className="space-y-2">
						<div className="flex justify-between text-sm">
							<dt className="text-gray-500 dark:text-gray-400">Nedbetalt om</dt>
							<dd className="font-medium text-gray-900 dark:text-white">
								{result.newMonths} mnd
								{newPayoffDate ? ` (${newPayoffDate})` : ""}
							</dd>
						</div>
						{extraOere === 0 && regularPayoffDate && (
							<div className="flex justify-between text-sm">
								<dt className="text-gray-500 dark:text-gray-400">
									Planlagt nedbetalt
								</dt>
								<dd className="text-gray-600 dark:text-gray-400">
									{regularPayoffDate}
								</dd>
							</div>
						)}
					</dl>
				)}
			</div>
		</div>
	);
}
