"use client";

import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { formatNOK } from "@/lib/format";

// Fixed color palette for categories — muted, data-viz appropriate
const CATEGORY_COLORS = [
	"#3b82f6",
	"#ef4444",
	"#f97316",
	"#22c55e",
	"#a855f7",
	"#06b6d4",
	"#f59e0b",
	"#ec4899",
	"#14b8a6",
	"#64748b",
	"#84cc16",
	"#8b5cf6",
];

interface CategoryData {
	categoryId: string | null;
	categoryName: string | null;
	total: number;
}

interface MonthlyData {
	month: string;
	expenses: number;
	income: number;
}

interface ChartsClientProps {
	selectedMonthStr: string;
	categoryBreakdown: CategoryData[];
	trendData: MonthlyData[];
}

// Format month label in short Norwegian format
function formatMonthLabel(monthStr: string): string {
	const date = parseISO(`${monthStr}-01`);
	return format(date, "MMM yy", { locale: nb });
}

const trendChartConfig = {
	expenses: { label: "Utgifter", color: "#ef4444" },
	income: { label: "Inntekt", color: "#22c55e" },
} satisfies ChartConfig;

export function ChartsClient({
	selectedMonthStr,
	categoryBreakdown,
	trendData,
}: ChartsClientProps) {
	const router = useRouter();
	const [categoryView, setCategoryView] = useState<"bar" | "pie">("bar");

	const selectedMonth = parseISO(`${selectedMonthStr}-01`);
	const monthLabel = format(selectedMonth, "MMMM yyyy", { locale: nb });
	const monthLabelDisplay =
		monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

	// Prepare category bar chart data
	const categoryBarData = categoryBreakdown.map((row) => ({
		name: row.categoryName ?? "Ukategorisert",
		total: row.total,
		categoryId: row.categoryId,
	}));

	// Prepare pie chart data
	const categoryPieData = categoryBreakdown.map((row, i) => ({
		name: row.categoryName ?? "Ukategorisert",
		value: row.total,
		categoryId: row.categoryId,
		fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
	}));

	// Prepare trend chart data
	const trendChartData = trendData.map((d) => ({
		month: formatMonthLabel(d.month),
		monthStr: d.month,
		expenses: d.expenses,
		income: d.income,
	}));

	function handleCategoryClick(categoryId: string | null, month: string) {
		const params = new URLSearchParams({ month });
		if (categoryId) params.set("categoryId", categoryId);
		router.push(`/expenses?${params.toString()}`);
	}

	function handleTrendExpensesClick(monthStr: string) {
		router.push(`/expenses?month=${monthStr}`);
	}

	function handleTrendIncomeClick(monthStr: string) {
		router.push(`/income?month=${monthStr}`);
	}

	const hasCategories = categoryBreakdown.length > 0;
	const hasTrend = trendData.some((d) => d.expenses > 0 || d.income > 0);

	return (
		<>

			<div className="space-y-6">
				{/* Category breakdown — bar or pie */}
				<div className="rounded-xl border border-border bg-card dark:border-border/40 dark:bg-card">
					<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-border/40">
						<h2 className="text-sm font-semibold text-foreground dark:text-card-foreground">
							Utgifter per kategori — {monthLabelDisplay}
						</h2>
						<div className="flex gap-1 rounded-lg border border-border p-0.5 dark:border-border/40">
							<button
								type="button"
								onClick={() => setCategoryView("bar")}
								className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
									categoryView === "bar"
										? "bg-card text-card-foreground dark:bg-card dark:text-foreground"
										: "text-foreground/70 hover:text-foreground dark:text-foreground/50 dark:hover:text-card-foreground"
								}`}
							>
								Søylediagram
							</button>
							<button
								type="button"
								onClick={() => setCategoryView("pie")}
								className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
									categoryView === "pie"
										? "bg-card text-card-foreground dark:bg-card dark:text-foreground"
										: "text-foreground/70 hover:text-foreground dark:text-foreground/50 dark:hover:text-card-foreground"
								}`}
							>
								Kakediagram
							</button>
						</div>
					</div>

					{!hasCategories ? (
						<div className="flex h-64 items-center justify-center text-sm text-foreground/50 dark:text-foreground/60">
							Ingen utgiftsdata for {monthLabelDisplay}
						</div>
					) : categoryView === "bar" ? (
						<div className="p-5">
							<ChartContainer config={{}} className="h-64 w-full">
								<BarChart
									data={categoryBarData}
									margin={{ top: 4, right: 8, left: 8, bottom: 40 }}
									onClick={(e) => {
										if (e?.activePayload?.[0]) {
											const d = e.activePayload[0]
												.payload as (typeof categoryBarData)[0];
											handleCategoryClick(d.categoryId, selectedMonthStr);
										}
									}}
								>
									<CartesianGrid vertical={false} stroke="rgba(156,163,175,0.35)" strokeWidth={1} />
									<XAxis
										dataKey="name"
										tick={{ fontSize: 11 }}
										angle={-35}
										textAnchor="end"
										interval={0}
									/>
									<YAxis
										tickFormatter={(v: number) =>
											`${Math.round(v / 100).toLocaleString("nb-NO")} kr`
										}
										tick={{ fontSize: 11 }}
										width={80}
									/>
									<Tooltip
										formatter={(value: number, name: string) => [
											formatNOK(value),
											name,
										]}
										cursor={{ fill: "rgba(0,0,0,0.04)" }}
									/>
									<Bar
										dataKey="total"
										name="Beløp"
										radius={[4, 4, 0, 0]}
										cursor="pointer"
									>
										{categoryBarData.map((entry, index) => (
											<Cell
												key={entry.name}
												fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
											/>
										))}
									</Bar>
								</BarChart>
							</ChartContainer>
						</div>
					) : (
						<div className="p-5">
							<div className="flex items-center gap-6">
								<div className="h-64 flex-1">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie
												data={categoryPieData}
												cx="50%"
												cy="50%"
												innerRadius={60}
												outerRadius={110}
												paddingAngle={2}
												dataKey="value"
												nameKey="name"
												cursor="pointer"
												onClick={(entry: { categoryId: string | null }) => {
													handleCategoryClick(
														entry.categoryId,
														selectedMonthStr,
													);
												}}
											>
												{categoryPieData.map((entry) => (
													<Cell key={entry.name} fill={entry.fill} />
												))}
											</Pie>
											<Tooltip
												formatter={(value: number) => [
													formatNOK(value),
													"Beløp",
												]}
											/>
										</PieChart>
									</ResponsiveContainer>
								</div>
								{/* Legend */}
								<div className="w-48 space-y-2">
									{categoryPieData.map((entry, index) => (
										<button
											type="button"
											key={entry.name}
											className="flex w-full items-center gap-2 text-left text-xs text-foreground/70 hover:text-foreground dark:text-foreground/50 dark:hover:text-card-foreground"
											onClick={() =>
												handleCategoryClick(entry.categoryId, selectedMonthStr)
											}
										>
											<span
												className="h-2.5 w-2.5 shrink-0 rounded-full"
												style={{
													backgroundColor:
														CATEGORY_COLORS[index % CATEGORY_COLORS.length],
												}}
											/>
											<span className="truncate">{entry.name}</span>
											<span className="ml-auto shrink-0 font-medium">
												{Math.round(entry.value / 10000).toLocaleString(
													"nb-NO",
												)}
												k
											</span>
										</button>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Spending trend over 6 months */}
				<div className="rounded-xl border border-border bg-card dark:border-border/40 dark:bg-card">
					<div className="border-b border-gray-100 px-5 py-4 dark:border-border/40">
						<h2 className="text-sm font-semibold text-foreground dark:text-card-foreground">
							Utgiftstrend — 6 måneder
						</h2>
					</div>
					{!hasTrend ? (
						<div className="flex h-64 items-center justify-center text-sm text-foreground/50 dark:text-foreground/60">
							Ingen data for perioden
						</div>
					) : (
						<div className="p-5">
							<ChartContainer config={trendChartConfig} className="h-64 w-full">
								<AreaChart
									data={trendChartData}
									margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
									onClick={(e) => {
										if (e?.activePayload?.[0]) {
											const d = e.activePayload[0]
												.payload as (typeof trendChartData)[0];
											handleTrendExpensesClick(d.monthStr);
										}
									}}
								>
									<defs>
										<linearGradient
											id="colorExpenses"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
											<stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid vertical={false} stroke="rgba(156,163,175,0.35)" strokeWidth={1} />
									<XAxis dataKey="month" tick={{ fontSize: 11 }} />
									<YAxis
										tickFormatter={(v: number) =>
											`${Math.round(v / 100).toLocaleString("nb-NO")} kr`
										}
										tick={{ fontSize: 11 }}
										width={80}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												formatter={(value, name) => [
													formatNOK(value as number),
													name,
												]}
											/>
										}
									/>
									<Area
										type="monotone"
										dataKey="expenses"
										stroke="#ef4444"
										strokeWidth={2}
										fill="url(#colorExpenses)"
										cursor="pointer"
									/>
								</AreaChart>
							</ChartContainer>
						</div>
					)}
				</div>

				{/* Income vs expenses comparison */}
				<div className="rounded-xl border border-border bg-card dark:border-border/40 dark:bg-card">
					<div className="border-b border-gray-100 px-5 py-4 dark:border-border/40">
						<h2 className="text-sm font-semibold text-foreground dark:text-card-foreground">
							Inntekt vs. utgifter — siste 6 måneder
						</h2>
					</div>
					{!hasTrend ? (
						<div className="flex h-64 items-center justify-center text-sm text-foreground/50 dark:text-foreground/60">
							Ingen data for perioden
						</div>
					) : (
						<div className="p-5">
							<ChartContainer config={trendChartConfig} className="h-64 w-full">
								<BarChart
									data={trendChartData}
									margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
									onClick={(e) => {
										if (e?.activePayload?.[0]) {
											const d = e.activePayload[0]
												.payload as (typeof trendChartData)[0];
											const dataKey = e.activePayload[0].dataKey as string;
											if (dataKey === "income") {
												handleTrendIncomeClick(d.monthStr);
											} else {
												handleTrendExpensesClick(d.monthStr);
											}
										}
									}}
								>
									<CartesianGrid vertical={false} stroke="rgba(156,163,175,0.35)" strokeWidth={1} />
									<XAxis dataKey="month" tick={{ fontSize: 11 }} />
									<YAxis
										tickFormatter={(v: number) =>
											`${Math.round(v / 100).toLocaleString("nb-NO")} kr`
										}
										tick={{ fontSize: 11 }}
										width={80}
									/>
									<ChartTooltip
										content={
											<ChartTooltipContent
												formatter={(value, name) => [
													formatNOK(value as number),
													name,
												]}
											/>
										}
									/>
									<Legend />
									<Bar
										dataKey="income"
										fill="#22c55e"
										radius={[4, 4, 0, 0]}
										cursor="pointer"
									/>
									<Bar
										dataKey="expenses"
										fill="#ef4444"
										radius={[4, 4, 0, 0]}
										cursor="pointer"
									/>
								</BarChart>
							</ChartContainer>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
