import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { getVisibleAccounts } from "@/lib/accounts";
import { createSavingsAccount } from "../actions";
import { SavingsForm } from "../savings-form";

export default async function NewSavingsAccountPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const visibleAccounts = householdId
		? await getVisibleAccounts(user.id as string, householdId)
		: [];

	return (
		<div className="p-8">
			<div className="mb-6">
				<Link
					href="/savings"
					className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
				>
					&larr; Tilbake til sparing
				</Link>
			</div>

			<div className="mx-auto max-w-lg">
				<h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
					Ny sparekonto
				</h2>
				<SavingsForm
					action={createSavingsAccount}
					accounts={visibleAccounts}
					submitLabel="Opprett sparekonto"
				/>
			</div>
		</div>
	);
}
