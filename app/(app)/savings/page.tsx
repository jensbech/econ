import { and, eq, isNull } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { savingsGoals } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { formatNOK } from "@/lib/format";
import { getHouseholdId } from "@/lib/households";
import { deleteSavingsGoal, updateProgress } from "./actions";
import { GoalCard } from "./goal-card";

export default async function SavingsPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const goals = householdId
		? await db
				.select()
				.from(savingsGoals)
				.where(
					and(
						eq(savingsGoals.householdId, householdId),
						isNull(savingsGoals.deletedAt),
					),
				)
		: [];

	const totalTarget = goals.reduce((s, g) => s + g.targetOere, 0);
	const totalCurrent = goals.reduce((s, g) => s + g.currentOere, 0);
	const overallPct =
		totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

	return (
		<div className="p-8">
			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
						Sparemål
					</h2>
					{goals.length > 0 && (
						<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Totalt spart:{" "}
							<span className="font-medium text-green-600 dark:text-green-400">
								{formatNOK(totalCurrent)}
							</span>{" "}
							av{" "}
							<span className="font-medium text-gray-700 dark:text-gray-300">
								{formatNOK(totalTarget)}
							</span>
						</p>
					)}
				</div>
				<Link
					href="/savings/new"
					className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
				>
					<Plus className="h-4 w-4" />
					Nytt sparemål
				</Link>
			</div>

			{/* Summary card */}
			{goals.length > 0 && (
				<div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
					<div className="flex items-end justify-between">
						<div>
							<p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
								Samlet fremgang
							</p>
							<p className="mt-1 text-3xl font-bold text-indigo-600 dark:text-indigo-400">
								{overallPct}%
							</p>
							<p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
								{formatNOK(totalCurrent)} av {formatNOK(totalTarget)} totalt
							</p>
						</div>
						<div className="text-right text-sm text-gray-500 dark:text-gray-400">
							<p>
								<span className="font-medium text-gray-900 dark:text-white">
									{goals.length}
								</span>{" "}
								{goals.length === 1 ? "sparemål" : "sparemål"}
							</p>
							<p>
								<span className="font-medium text-green-600 dark:text-green-400">
									{goals.filter((g) => g.currentOere >= g.targetOere).length}
								</span>{" "}
								nådd
							</p>
						</div>
					</div>
					<div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
						<div
							className={`h-full rounded-full transition-all ${
								overallPct >= 100 ? "bg-green-500" : "bg-indigo-500"
							}`}
							style={{ width: `${overallPct}%` }}
						/>
					</div>
				</div>
			)}

			{/* Goal cards */}
			{goals.length === 0 ? (
				<div className="rounded-xl border border-dashed border-gray-200 py-20 text-center dark:border-gray-700">
					<p className="text-gray-400 dark:text-gray-500">
						Ingen sparemål ennå
					</p>
					<p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
						Opprett et sparemål for å begynne å spare mot noe konkret.
					</p>
					<Link
						href="/savings/new"
						className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
					>
						<Plus className="h-4 w-4" />
						Nytt sparemål
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
					{goals.map((goal) => {
						const updateAction = updateProgress.bind(null, goal.id);
						const deleteAction = deleteSavingsGoal.bind(null, goal.id);

						return (
							<GoalCard
								key={goal.id}
								goal={{
									id: goal.id,
									name: goal.name,
									targetOere: goal.targetOere,
									currentOere: goal.currentOere,
									targetDate: goal.targetDate,
								}}
								updateAction={updateAction}
								deleteAction={deleteAction}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
