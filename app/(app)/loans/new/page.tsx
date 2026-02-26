import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { getVisibleAccounts } from "@/lib/accounts";
import { createLoan } from "../actions";
import { LoanForm } from "../loan-form";

export default async function NewLoanPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const visibleAccounts = householdId
		? await getVisibleAccounts(user.id as string, householdId)
		: [];

	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<div className="mb-6">
				<Link
					href="/loans"
					className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
				>
					&larr; Tilbake til lån
				</Link>
			</div>

			<div className="mx-auto max-w-lg">
				<h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
					Legg til lån
				</h2>
				<LoanForm
					action={createLoan}
					accounts={visibleAccounts}
					submitLabel="Legg til lån"
				/>
			</div>
		</div>
	);
}
