import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { and, eq, isNull } from "drizzle-orm";
import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import Link from "next/link";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { categories, recurringTemplates } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { formatNOK } from "@/lib/format";
import { getHouseholdId } from "@/lib/households";
import { deleteRecurringTemplate } from "./actions";

const FREQUENCY_LABELS: Record<string, string> = {
	weekly: "Ukentlig",
	monthly: "Månedlig",
	annual: "Årlig",
};

function parseLocalDate(dateStr: string): Date {
	return new Date(`${dateStr}T12:00:00`);
}

export default async function RecurringExpensesPage() {
	const user = await verifySession();
	const householdId = await getHouseholdId(user.id as string);

	const templates = householdId
		? await db
				.select({
					id: recurringTemplates.id,
					description: recurringTemplates.description,
					amountOere: recurringTemplates.amountOere,
					frequency: recurringTemplates.frequency,
					startDate: recurringTemplates.startDate,
					endDate: recurringTemplates.endDate,
					categoryName: categories.name,
				})
				.from(recurringTemplates)
				.leftJoin(categories, eq(recurringTemplates.categoryId, categories.id))
				.where(
					and(
						eq(recurringTemplates.householdId, householdId),
						eq(recurringTemplates.type, "expense"),
						isNull(recurringTemplates.deletedAt),
					),
				)
				.orderBy(recurringTemplates.description)
		: [];

	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
						Gjentagende utgifter
					</h1>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						Administrer faste og gjentagende utgifter.
					</p>
				</div>
				<Button asChild className="gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
					<Link href="/expenses/recurring/new">
						<Plus className="h-4 w-4" />
						Ny gjentagende utgift
					</Link>
				</Button>
			</div>

			{templates.length === 0 ? (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
					<Repeat className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
					<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
						Ingen gjentagende utgifter ennå
					</p>
					<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
						Legg til faste utgifter som husleie, strøm eller abonnementer.
					</p>
					<Button
						asChild
						className="mt-4 gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
						size="sm"
					>
						<Link href="/expenses/recurring/new">
							<Plus className="h-4 w-4" />
							Legg til
						</Link>
					</Button>
				</div>
			) : (
				<div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
					<ul className="divide-y divide-gray-100 dark:divide-gray-800">
						{templates.map((template) => {
							const boundDelete = deleteRecurringTemplate.bind(
								null,
								template.id,
							);
							return (
								<li
									key={template.id}
									className="flex items-center gap-4 px-5 py-4"
								>
									<Repeat className="h-4 w-4 flex-shrink-0 text-indigo-500 dark:text-indigo-400" />

									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-medium text-gray-900 dark:text-white">
												{template.description}
											</span>
											<Badge variant="secondary">
												{FREQUENCY_LABELS[template.frequency] ??
													template.frequency}
											</Badge>
											{template.categoryName && (
												<Badge variant="outline">{template.categoryName}</Badge>
											)}
										</div>
										<div className="mt-0.5 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
											<span>
												Fra{" "}
												{format(
													parseLocalDate(template.startDate),
													"d. MMM yyyy",
													{ locale: nb },
												)}
											</span>
											{template.endDate && (
												<span>
													Til{" "}
													{format(
														parseLocalDate(template.endDate),
														"d. MMM yyyy",
														{ locale: nb },
													)}
												</span>
											)}
										</div>
									</div>

									<div className="flex-shrink-0 text-right">
										<span className="text-sm font-semibold text-red-600 dark:text-red-400">
											{formatNOK(template.amountOere)}
										</span>
									</div>

									<div className="flex flex-shrink-0 items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											asChild
										>
											<Link href={`/expenses/recurring/${template.id}/edit`}>
												<Pencil className="h-4 w-4 text-gray-500" />
											</Link>
										</Button>

										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button variant="ghost" size="icon" className="h-8 w-8">
													<Trash2 className="h-4 w-4 text-red-400" />
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>
														Slett gjentagende utgift
													</AlertDialogTitle>
													<AlertDialogDescription>
														Er du sikker på at du vil slette «
														{template.description}»? Fremtidige utgifter vil
														ikke lenger genereres automatisk.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Avbryt</AlertDialogCancel>
													<form action={boundDelete}>
														<AlertDialogAction
															type="submit"
															className="bg-red-600 hover:bg-red-700"
														>
															Slett
														</AlertDialogAction>
													</form>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									</div>
								</li>
							);
						})}
					</ul>
				</div>
			)}

			<div className="mt-4">
				<Button variant="outline" asChild size="sm">
					<Link href="/expenses">← Tilbake til utgifter</Link>
				</Button>
			</div>
		</div>
	);
}
