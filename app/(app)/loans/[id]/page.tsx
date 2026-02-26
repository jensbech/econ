import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { expenses, loans } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { formatNOK } from "@/lib/format";
import { getHouseholdId } from "@/lib/households";
import { computeLoanBalance } from "@/lib/loan-math";
import { LoanWhatIfPanel } from "@/components/loan-what-if-panel";
import { addLoanPayment } from "../actions";
import { PaymentForm } from "../payment-form";
import { DeleteLoanButton, DeletePaymentButton } from "./loan-delete-buttons";

interface LoanDetailPageProps {
	params: Promise<{ id: string }>;
}

const LOAN_TYPE_LABELS: Record<string, string> = {
	mortgage: "Boliglån",
	student: "Studielån",
	car: "Billån",
	consumer: "Forbrukslån",
	other: "Annet",
};

export default async function LoanDetailPage({ params }: LoanDetailPageProps) {
	const { id } = await params;
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);
	if (!householdId) notFound();

	const [loan] = await db
		.select()
		.from(loans)
		.where(
			and(
				eq(loans.id, id),
				eq(loans.householdId, householdId),
				isNull(loans.deletedAt),
			),
		)
		.limit(1);

	if (!loan) notFound();

	// Fetch expense-based payments — single source of truth
	const expensePayments = await db
		.select({
			id: expenses.id,
			date: expenses.date,
			amountOere: expenses.amountOere,
			interestOere: expenses.interestOere,
			principalOere: expenses.principalOere,
			notes: expenses.notes,
		})
		.from(expenses)
		.where(
			and(
				eq(expenses.loanId, id),
				eq(expenses.householdId, householdId),
				isNull(expenses.deletedAt),
			),
		)
		.orderBy(desc(expenses.date));

	// Derive balance from expenses (principalOere ?? amountOere)
	const balance = computeLoanBalance(
		loan.principalOere,
		loan.interestRate,
		loan.termMonths,
		loan.startDate,
		expensePayments.map((p) => ({
			date: p.date,
			amountOere: p.principalOere ?? p.amountOere,
		})),
		loan.openingBalanceOere,
		loan.openingBalanceDate,
	);

	const paymentAction = addLoanPayment.bind(null, id);

	const remainingYears = Math.floor(balance.remainingMonths / 12);
	const remainingMonthsRemainder = balance.remainingMonths % 12;

	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<div className="mb-6">
				<Link
					href="/loans"
					className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground/80 dark:hover:text-gray-200"
				>
					&larr; Tilbake til lån
				</Link>
			</div>

			<div className="mb-8 flex items-start justify-between">
				<div>
					<h2 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
						{loan.name}
					</h2>
					<p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
						{LOAN_TYPE_LABELS[loan.type] ?? loan.type} &middot; Startet{" "}
						{format(parseISO(loan.startDate), "d. MMMM yyyy", { locale: nb })}
					</p>
				</div>
				<div className="flex items-center gap-2">
				<a
					href={`/loans/${id}/edit`}
					className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:bg-card dark:border-border/40 dark:text-foreground/60 dark:hover:bg-card/50"
				>
					Rediger
				</a>
				<DeleteLoanButton loanId={id} />
			</div>
			</div>

			{/* Loan summary cards */}
			<div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
				<div className="rounded-xl border border-border bg-card p-5 dark:border-border/40 dark:bg-card">
					<p className="text-xs text-foreground/60 dark:text-foreground/50">
						Gjenstående saldo
					</p>
					<p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">
						{formatNOK(balance.currentBalanceOere)}
					</p>
					<p className="mt-0.5 text-xs text-foreground/60 dark:text-foreground/50">
						av {formatNOK(loan.principalOere)} opprinnelig
					</p>
				</div>

				<div className="rounded-xl border border-border bg-card p-5 dark:border-border/40 dark:bg-card">
					<p className="text-xs text-foreground/60 dark:text-foreground/50">
						Månedlig terminbeløp
					</p>
					<p className="mt-2 text-2xl font-bold text-foreground dark:text-card-foreground">
						{formatNOK(balance.monthlyPaymentOere)}
					</p>
					<p className="mt-0.5 text-xs text-foreground/60 dark:text-foreground/50">
						{loan.interestRate}% nominell rente
					</p>
				</div>

				<div className="rounded-xl border border-border bg-card p-5 dark:border-border/40 dark:bg-card">
					<p className="text-xs text-foreground/60 dark:text-foreground/50">
						Gjenstående løpetid
					</p>
					<p className="mt-2 text-2xl font-bold text-foreground dark:text-card-foreground">
						{balance.remainingMonths === 0
							? "Nedbetalt"
							: remainingYears > 0
								? `${remainingYears} år ${remainingMonthsRemainder > 0 ? `${remainingMonthsRemainder} mnd` : ""}`
								: `${balance.remainingMonths} mnd`}
					</p>
					<p className="mt-0.5 text-xs text-foreground/60 dark:text-foreground/50">
						Opprinnelig {loan.termMonths} måneder
					</p>
				</div>

				<div className="rounded-xl border border-border bg-card p-5 dark:border-border/40 dark:bg-card">
					<p className="text-xs text-foreground/60 dark:text-foreground/50">
						Nedbetalt
					</p>
					<p className="mt-2 text-2xl font-bold text-foreground dark:text-card-foreground">
						{balance.principalPaidPct}%
					</p>
					<div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary/8 dark:bg-card">
						<div
							className="h-full rounded-full bg-background0 dark:bg-gray-400 transition-all"
							style={{ width: `${balance.principalPaidPct}%` }}
						/>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
				{/* Payment history */}
				<div className="lg:col-span-2">
					<h3 className="mb-4 text-sm font-medium text-foreground/60 dark:text-foreground/50">
						Betalingshistorikk
					</h3>
					{expensePayments.length === 0 ? (
						<div className="rounded-xl border border-dashed border-border py-12 text-center dark:border-border/40">
							<p className="text-sm text-foreground/50 dark:text-foreground/60">
								Ingen betalinger registrert ennå
							</p>
						</div>
					) : (
						<div className="overflow-hidden rounded-xl border border-border dark:border-border/40">
							<table className="w-full text-sm">
								<thead className="bg-background dark:bg-card/50">
									<tr>
										<th className="px-4 py-3 text-left font-medium text-foreground/60 dark:text-foreground/50">
											Dato
										</th>
										<th className="px-4 py-3 text-right font-medium text-foreground/60 dark:text-foreground/50">
											Totalt
										</th>
										<th className="px-4 py-3 text-right font-medium text-foreground/60 dark:text-foreground/50">
											Renter
										</th>
										<th className="px-4 py-3 text-right font-medium text-foreground/60 dark:text-foreground/50">
											Avdrag
										</th>
										<th className="px-4 py-3 text-right font-medium text-foreground/60 dark:text-foreground/50" />
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
									{expensePayments.map((p) => (
										<tr key={p.id} className="bg-card dark:bg-card">
											<td className="px-4 py-3 text-foreground dark:text-card-foreground">
												{format(parseISO(p.date), "d. MMMM yyyy", {
													locale: nb,
												})}
											</td>
											<td className="px-4 py-3 text-right font-medium text-foreground dark:text-card-foreground">
												{formatNOK(p.amountOere)}
											</td>
											<td className="px-4 py-3 text-right text-foreground/70 dark:text-foreground/50">
												{p.interestOere !== null
													? formatNOK(p.interestOere)
													: "—"}
											</td>
											<td className="px-4 py-3 text-right text-foreground/70 dark:text-foreground/50">
												{p.principalOere !== null
													? formatNOK(p.principalOere)
													: "—"}
											</td>
											<td className="px-4 py-3 text-right">
												<DeletePaymentButton paymentId={p.id} loanId={id} />
											</td>
										</tr>
									))}
								</tbody>
								<tfoot className="bg-background dark:bg-card/50">
									<tr>
										<td className="px-4 py-3 text-sm font-medium text-foreground/80 dark:text-foreground/80">
											Totalt registrert
										</td>
										<td className="px-4 py-3 text-right font-semibold text-foreground dark:text-card-foreground">
											{formatNOK(
												expensePayments.reduce(
													(s, p) => s + p.amountOere,
													0,
												),
											)}
										</td>
										<td className="px-4 py-3 text-right text-sm text-foreground/70 dark:text-foreground/50">
											{formatNOK(
												expensePayments.reduce(
													(s, p) => s + (p.interestOere ?? 0),
													0,
												),
											)}
										</td>
										<td className="px-4 py-3 text-right text-sm text-foreground/70 dark:text-foreground/50">
											{formatNOK(
												expensePayments.reduce(
													(s, p) => s + (p.principalOere ?? 0),
													0,
												),
											)}
										</td>
										<td />
									</tr>
								</tfoot>
							</table>
						</div>
					)}
				</div>

				{/* Add payment + what-if */}
				<div className="space-y-6">
					<div>
						<h3 className="mb-4 text-sm font-medium text-foreground/60 dark:text-foreground/50">
							Registrer betaling
						</h3>
						<div className="rounded-xl border border-border bg-card p-5 dark:border-border/40 dark:bg-card">
							<PaymentForm action={paymentAction} />
						</div>
					</div>

					{balance.currentBalanceOere > 0 && (
						<div>
							<h3 className="mb-4 text-sm font-medium text-foreground/60 dark:text-foreground/50">
								Ekstra nedbetaling
							</h3>
							<LoanWhatIfPanel
								currentBalanceOere={balance.currentBalanceOere}
								annualRatePct={loan.interestRate}
								monthlyPaymentOere={balance.monthlyPaymentOere}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
