import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { accounts, loans } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { LoanForm } from "../../loan-form";
import { updateLoan } from "../../actions";

interface Props {
	params: Promise<{ id: string }>;
}

export default async function EditLoanPage({ params }: Props) {
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
				eq(loans.userId, user.id as string),
				isNull(loans.deletedAt),
			),
		)
		.limit(1);

	if (!loan) notFound();

	const accountOptions = await db
		.select({ id: accounts.id, name: accounts.name })
		.from(accounts)
		.where(
			and(
				eq(accounts.householdId, householdId),
				isNull(accounts.deletedAt),
			),
		);

	const action = updateLoan.bind(null, id);

	return (
		<div className="p-4 sm:p-8 max-w-lg">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold text-foreground dark:text-card-foreground">
					Rediger lån
				</h1>
				<p className="mt-1 text-sm text-foreground/60 dark:text-foreground/50">
					{loan.name}
				</p>
			</div>
			<LoanForm
				action={action}
				defaultName={loan.name}
				defaultType={loan.type}
				defaultPrincipalNOK={String(loan.principalOere / 100)}
				defaultInterestRate={String(loan.interestRate)}
				defaultTermMonths={String(loan.termMonths)}
				defaultStartDate={new Date(loan.startDate)}
				defaultAccountId={loan.accountId ?? undefined}
				defaultOpeningBalanceNOK={
					loan.openingBalanceOere != null
						? String(loan.openingBalanceOere / 100)
						: undefined
				}
				defaultOpeningBalanceDate={
					loan.openingBalanceDate
						? new Date(loan.openingBalanceDate)
						: undefined
				}
				accounts={accountOptions}
				submitLabel="Lagre endringer"
				cancelHref={`/loans/${id}`}
			/>
		</div>
	);
}
