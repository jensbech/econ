"use client";

import { addMonths, format } from "date-fns";
import { nb } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatNOK } from "@/lib/format";

// ---------------------------------------------------------------------------
// Loan payoff helpers
// ---------------------------------------------------------------------------

interface LoanPayoffResult {
	months: number | null;
	payoffDate: Date | null;
	totalInterestOere: number | null;
	totalPaidOere: number | null;
}

function calcLoanPayoff(
	balanceOere: number,
	annualRatePct: number,
	monthlyPaymentOere: number,
): LoanPayoffResult {
	if (balanceOere <= 0 || monthlyPaymentOere <= 0) {
		return {
			months: null,
			payoffDate: null,
			totalInterestOere: null,
			totalPaidOere: null,
		};
	}
	const r = annualRatePct / 100 / 12;

	// If rate is 0
	if (r === 0) {
		const months = Math.ceil(balanceOere / monthlyPaymentOere);
		return {
			months,
			payoffDate: addMonths(new Date(), months),
			totalInterestOere: 0,
			totalPaidOere: months * monthlyPaymentOere,
		};
	}

	// Check that payment covers interest
	const monthlyInterest = Math.round(balanceOere * r);
	if (monthlyPaymentOere <= monthlyInterest) {
		return {
			months: null,
			payoffDate: null,
			totalInterestOere: null,
			totalPaidOere: null,
		};
	}

	const months = Math.ceil(
		-Math.log(1 - (r * balanceOere) / monthlyPaymentOere) / Math.log(1 + r),
	);
	const totalPaidOere = months * monthlyPaymentOere;
	const totalInterestOere = totalPaidOere - balanceOere;

	return {
		months,
		payoffDate: addMonths(new Date(), months),
		totalInterestOere: Math.max(0, totalInterestOere),
		totalPaidOere,
	};
}

// ---------------------------------------------------------------------------
// Savings projector helpers
// ---------------------------------------------------------------------------

function calcSavings(
	initialOere: number,
	monthlyContribOere: number,
	annualReturnPct: number,
	years: number,
): number {
	const months = years * 12;
	const r = annualReturnPct / 100 / 12;
	if (r === 0) {
		return initialOere + monthlyContribOere * months;
	}
	const growth = (1 + r) ** months;
	return Math.round(
		initialOere * growth + monthlyContribOere * ((growth - 1) / r),
	);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CalculatorPage() {
	// --- Loan payoff state ---
	const [loanBalance, setLoanBalance] = useState("500000");
	const [loanRate, setLoanRate] = useState("5.0");
	const [loanPayment, setLoanPayment] = useState("10000");
	const [sliderValue, setSliderValue] = useState(10000);

	// Slider min/max derived from balance and rate
	const balanceOere = Math.round((Number(loanBalance) || 0) * 100);
	const annualRate = Number(loanRate) || 0;
	const minPayment = Math.max(
		100,
		Math.round((balanceOere * (annualRate / 100 / 12)) / 100) * 100 + 100,
	);
	const maxPayment = Math.max(minPayment + 100, Math.round(balanceOere * 0.05));

	const monthlyPaymentOere = Math.round((Number(loanPayment) || 0) * 100);

	const loanResult = useMemo(
		() => calcLoanPayoff(balanceOere, annualRate, monthlyPaymentOere),
		[balanceOere, annualRate, monthlyPaymentOere],
	);

	// Sync slider → input
	function handleSliderChange(val: number[]) {
		const nok = val[0];
		setSliderValue(nok);
		setLoanPayment(String(nok));
	}

	// Sync input → slider
	function handlePaymentInput(val: string) {
		setLoanPayment(val);
		const nok = Number(val) || 0;
		if (nok >= 0) setSliderValue(Math.min(nok, maxPayment));
	}

	// --- Savings state ---
	const [savingsInitial, setSavingsInitial] = useState("100000");
	const [savingsMonthly, setSavingsMonthly] = useState("5000");
	const [savingsReturn, setSavingsReturn] = useState("7.0");

	const initialOere = Math.round((Number(savingsInitial) || 0) * 100);
	const monthlyOere = Math.round((Number(savingsMonthly) || 0) * 100);
	const returnPct = Number(savingsReturn) || 0;

	const savingsAt5 = useMemo(
		() => calcSavings(initialOere, monthlyOere, returnPct, 5),
		[initialOere, monthlyOere, returnPct],
	);
	const savingsAt10 = useMemo(
		() => calcSavings(initialOere, monthlyOere, returnPct, 10),
		[initialOere, monthlyOere, returnPct],
	);
	const savingsAt20 = useMemo(
		() => calcSavings(initialOere, monthlyOere, returnPct, 20),
		[initialOere, monthlyOere, returnPct],
	);
	const savingsAt30 = useMemo(
		() => calcSavings(initialOere, monthlyOere, returnPct, 30),
		[initialOere, monthlyOere, returnPct],
	);

	const paymentTooLow =
		loanResult.months === null && balanceOere > 0 && monthlyPaymentOere > 0;

	return (
		<div className="p-8">
			<h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">
				Kalkulator
			</h1>
			<p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
				Beregn nedbetalingstid og spareprognose — alt skjer i nettleseren.
			</p>

			<div className="grid gap-8 lg:grid-cols-2">
				{/* ---------------------------------------------------------------- */}
				{/* Panel 1: Loan payoff */}
				{/* ---------------------------------------------------------------- */}
				<Card>
					<CardHeader>
						<CardTitle>Lånekalkulatoren</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Inputs */}
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="loan-balance">Gjenstående saldo (NOK)</Label>
								<Input
									id="loan-balance"
									type="number"
									min={0}
									step={1000}
									value={loanBalance}
									onChange={(e) => setLoanBalance(e.target.value)}
									placeholder="500 000"
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="loan-rate">Årlig rente (%)</Label>
								<Input
									id="loan-rate"
									type="number"
									min={0}
									max={30}
									step={0.1}
									value={loanRate}
									onChange={(e) => setLoanRate(e.target.value)}
									placeholder="5.0"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="loan-payment">Månedlig betaling (NOK)</Label>
								<Input
									id="loan-payment"
									type="number"
									min={0}
									step={100}
									value={loanPayment}
									onChange={(e) => handlePaymentInput(e.target.value)}
									placeholder="10 000"
								/>
								<Slider
									min={minPayment / 100}
									max={maxPayment / 100}
									step={100}
									value={[
										Math.max(
											minPayment / 100,
											Math.min(sliderValue, maxPayment / 100),
										),
									]}
									onValueChange={handleSliderChange}
									className="mt-2"
								/>
								<div className="flex justify-between text-xs text-gray-400">
									<span>{formatNOK(minPayment)}</span>
									<span>{formatNOK(maxPayment)}</span>
								</div>
							</div>
						</div>

						{/* Results */}
						<div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
							{balanceOere <= 0 ? (
								<p className="text-sm text-gray-400">
									Skriv inn gjenstående saldo for å beregne.
								</p>
							) : paymentTooLow ? (
								<p className="text-sm text-red-600 dark:text-red-400">
									Månedlig betaling er for lav til å dekke rentekostnadene. Øk
									betalingen.
								</p>
							) : loanResult.months !== null ? (
								<dl className="space-y-3">
									<div className="flex items-start justify-between gap-4">
										<dt className="text-sm text-gray-500 dark:text-gray-400">
											Nedbetalt om
										</dt>
										<dd className="text-right font-semibold text-gray-900 dark:text-white">
											{loanResult.months} måneder
											<span className="ml-1 text-xs font-normal text-gray-500">
												({Math.floor(loanResult.months / 12)} år{" "}
												{loanResult.months % 12} mnd)
											</span>
										</dd>
									</div>
									<div className="flex items-start justify-between gap-4">
										<dt className="text-sm text-gray-500 dark:text-gray-400">
											Nedbetalt dato
										</dt>
										<dd className="font-semibold text-gray-900 dark:text-white">
											{loanResult.payoffDate
												? format(loanResult.payoffDate, "MMMM yyyy", {
														locale: nb,
													})
												: "–"}
										</dd>
									</div>
									<div className="flex items-start justify-between gap-4">
										<dt className="text-sm text-gray-500 dark:text-gray-400">
											Totale rentekostnader
										</dt>
										<dd className="font-semibold text-red-600 dark:text-red-400">
											{loanResult.totalInterestOere !== null
												? formatNOK(loanResult.totalInterestOere)
												: "–"}
										</dd>
									</div>
									<div className="flex items-start justify-between gap-4">
										<dt className="text-sm text-gray-500 dark:text-gray-400">
											Totalt betalt
										</dt>
										<dd className="font-semibold text-gray-900 dark:text-white">
											{loanResult.totalPaidOere !== null
												? formatNOK(loanResult.totalPaidOere)
												: "–"}
										</dd>
									</div>
								</dl>
							) : (
								<p className="text-sm text-gray-400">
									Fyll inn alle feltene for å beregne.
								</p>
							)}
						</div>
					</CardContent>
				</Card>

				{/* ---------------------------------------------------------------- */}
				{/* Panel 2: Savings projector */}
				{/* ---------------------------------------------------------------- */}
				<Card>
					<CardHeader>
						<CardTitle>Sparekalkulator</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Inputs */}
						<div className="space-y-4">
							<div className="space-y-1.5">
								<Label htmlFor="savings-initial">Startbeløp (NOK)</Label>
								<Input
									id="savings-initial"
									type="number"
									min={0}
									step={1000}
									value={savingsInitial}
									onChange={(e) => setSavingsInitial(e.target.value)}
									placeholder="100 000"
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="savings-monthly">Månedlig sparing (NOK)</Label>
								<Input
									id="savings-monthly"
									type="number"
									min={0}
									step={500}
									value={savingsMonthly}
									onChange={(e) => setSavingsMonthly(e.target.value)}
									placeholder="5 000"
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="savings-return">
									Forventet avkastning (% per år)
								</Label>
								<Input
									id="savings-return"
									type="number"
									min={0}
									max={30}
									step={0.5}
									value={savingsReturn}
									onChange={(e) => setSavingsReturn(e.target.value)}
									placeholder="7.0"
								/>
							</div>
						</div>

						{/* Results */}
						<div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
							<h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
								Prognose
							</h3>
							<dl className="space-y-3">
								{(
									[
										[5, savingsAt5],
										[10, savingsAt10],
										[20, savingsAt20],
										[30, savingsAt30],
									] as [number, number][]
								).map(([years, value]) => {
									const contributions = initialOere + monthlyOere * years * 12;
									const gain = value - contributions;
									return (
										<div
											key={years}
											className="flex items-center justify-between gap-4"
										>
											<dt className="text-sm text-gray-500 dark:text-gray-400">
												Om {years} år
											</dt>
											<dd className="text-right">
												<div className="font-semibold text-green-700 dark:text-green-400">
													{formatNOK(value)}
												</div>
												{gain > 0 && (
													<div className="text-xs text-gray-400">
														+{formatNOK(gain)} avkastning
													</div>
												)}
											</dd>
										</div>
									);
								})}
							</dl>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
