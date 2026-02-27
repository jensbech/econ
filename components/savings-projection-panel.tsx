"use client";

import { useMemo, useState } from "react";
import { formatNOK } from "@/lib/format";
import { calcSavingsProjection } from "@/lib/savings-math";

interface SavingsProjectionPanelProps {
	currentBalanceOere: number;
	suggestedMonthlyOere?: number;
}

export function SavingsProjectionPanel({
	currentBalanceOere,
	suggestedMonthlyOere = 0,
}: SavingsProjectionPanelProps) {
	const defaultMonthly =
		suggestedMonthlyOere > 0
			? String(Math.round(suggestedMonthlyOere / 100))
			: "";
	const [monthlyStr, setMonthlyStr] = useState(defaultMonthly);
	const [returnStr, setReturnStr] = useState("3.0");

	const monthlyOere = Math.round((Number(monthlyStr) || 0) * 100);
	const returnPct = Number(returnStr) || 0;

	const projections = useMemo(
		() =>
			[5, 10, 20, 30].map((years) => ({
				years,
				value: calcSavingsProjection(
					currentBalanceOere,
					monthlyOere,
					returnPct,
					years,
				),
			})),
		[currentBalanceOere, monthlyOere, returnPct],
	);

	const maxValue = Math.max(...projections.map((p) => p.value), 1);

	return (
		<div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
			<div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
				<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
					Fremtidsprojektion
				</h3>
			</div>
			<div className="p-5">
				<div className="mb-5 grid grid-cols-2 gap-3">
					<div className="space-y-1">
						<label
							htmlFor="proj-monthly"
							className="text-xs font-medium text-gray-500 dark:text-gray-400"
						>
							Månedlig sparing (NOK)
						</label>
						<input
							id="proj-monthly"
							type="number"
							min={0}
							step={500}
							value={monthlyStr}
							onChange={(e) => setMonthlyStr(e.target.value)}
							placeholder="5000"
							className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
						/>
					</div>
					<div className="space-y-1">
						<label
							htmlFor="proj-return"
							className="text-xs font-medium text-gray-500 dark:text-gray-400"
						>
							Forv. avkastning (% p.a.)
						</label>
						<input
							id="proj-return"
							type="number"
							min={0}
							max={30}
							step={0.5}
							value={returnStr}
							onChange={(e) => setReturnStr(e.target.value)}
							placeholder="3.0"
							className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
						/>
					</div>
				</div>
				<dl className="space-y-3">
					{projections.map(({ years, value }) => {
						const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
						return (
							<div key={years}>
								<div className="mb-1 flex items-baseline justify-between">
									<dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
										Om {years} år
									</dt>
									<dd className="text-sm font-bold tabular-nums text-primary">
										{formatNOK(value)}
									</dd>
								</div>
								<div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
									<div
										className="h-full rounded-full bg-green-400 transition-all duration-500 ease-out dark:bg-green-500"
										style={{ width: `${pct}%` }}
									/>
								</div>
							</div>
						);
					})}
				</dl>
			</div>
		</div>
	);
}
