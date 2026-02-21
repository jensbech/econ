import Link from "next/link";
import { createSavingsGoal } from "../actions";
import { SavingsForm } from "../savings-form";

export default function NewSavingsGoalPage() {
	return (
		<div className="p-8">
			<div className="mb-6">
				<Link
					href="/savings"
					className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
				>
					← Tilbake til sparemål
				</Link>
			</div>

			<div className="mx-auto max-w-lg">
				<h2 className="mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
					Nytt sparemål
				</h2>
				<SavingsForm
					action={createSavingsGoal}
					submitLabel="Opprett sparemål"
				/>
			</div>
		</div>
	);
}
