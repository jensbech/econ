import Link from "next/link";
import { createLoan } from "../actions";
import { LoanForm } from "../loan-form";

export default function NewLoanPage() {
	return (
		<div className="p-8">
			<div className="mb-6">
				<Link
					href="/loans"
					className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
				>
					← Tilbake til lån
				</Link>
			</div>

			<div className="mx-auto max-w-lg">
				<h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
					Legg til lån
				</h2>
				<LoanForm action={createLoan} submitLabel="Legg til lån" />
			</div>
		</div>
	);
}
