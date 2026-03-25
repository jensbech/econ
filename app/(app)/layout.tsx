import type React from "react";
import {
	BarChart3,
	CreditCard,
	HelpCircle,
	Import,
	Landmark,
	LayoutDashboard,
	LogOut,
	PiggyBank,
	Settings,
	TrendingUp,
} from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { logout } from "@/app/actions/login";
import { AccountSelector } from "@/components/account-selector";
import { MonthSelector } from "@/components/month-selector";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { NavLink } from "@/components/nav-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { getVisibleAccounts } from "@/lib/accounts";
import { getHouseholdId } from "@/lib/households";

const navGroups: Array<{
	label: string | null;
	items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
	{
		label: null,
		items: [{ href: "/dashboard", label: "Oversikt", icon: LayoutDashboard }],
	},
	{
		label: "Transaksjoner",
		items: [
			{ href: "/expenses", label: "Utgifter", icon: CreditCard },
			{ href: "/income", label: "Inntekt", icon: TrendingUp },
		],
	},
	{
		label: "Økonomi",
		items: [
			{ href: "/loans", label: "Lån", icon: BarChart3 },
			{ href: "/savings", label: "Sparing", icon: PiggyBank },
			{ href: "/accounts", label: "Kontoer", icon: Landmark },
		],
	},
	{
		label: "Verktøy",
		items: [
			{ href: "/import", label: "Importer", icon: Import },
			{ href: "/settings/categories", label: "Kategorier", icon: Settings },
		],
	},
	{
		label: null,
		items: [{ href: "/guide", label: "Brukerveiledning", icon: HelpCircle }],
	},
];

function SidebarNav() {
	return (
		<nav className="flex-1 px-3 py-4">
			{navGroups.map((group, i) => (
				<div key={i}>
					{i > 0 && <div className="my-2 border-t border-border/30" />}
					{group.label && (
						<p className="mb-1 mt-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-foreground/35">
							{group.label}
						</p>
					)}
					<div className="space-y-0.5">
						{group.items.map(({ href, label, icon: Icon }) => (
							<NavLink key={href} href={href} label={label}>
								<Icon className="h-4 w-4 flex-shrink-0" />
							</NavLink>
						))}
					</div>
				</div>
			))}
		</nav>
	);
}

function UserAvatar({ name }: { name: string | null }) {
	return (
		<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
			{(name ?? "?")[0].toUpperCase()}
		</div>
	);
}

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const cookieStore = await cookies();
	const userId = cookieStore.get("userId")?.value;
	if (!userId) redirect("/");

	const [user] = await db
		.select({ id: users.id, name: users.name })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	if (!user) redirect("/");

	const householdId = await getHouseholdId(userId);

	const visibleAccounts = householdId
		? await getVisibleAccounts(userId, householdId)
		: [];

	const selectedRaw = cookieStore.get("selectedAccounts")?.value ?? "";
	const initialSelected = selectedRaw
		.split(",")
		.slice(0, 20)
		.filter((id) => visibleAccounts.some((a) => a.id === id));

	const now = new Date();
	const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const cookieMonth = cookieStore.get("selectedMonth")?.value ?? "";
	const initialMonth = /^\d{4}-(?:0[1-9]|1[0-2])$/.test(cookieMonth)
		? cookieMonth
		: currentMonthStr;

	return (
		<div className="flex min-h-screen bg-background dark:bg-background">
			{/* Desktop Sidebar — light & warm */}
			<aside className="hidden w-60 flex-shrink-0 flex-col bg-background dark:bg-card md:flex border-r border-border/50 animate-sidebar-in">
				<div className="border-b border-border/50 px-5 py-4">
					<div className="flex items-center gap-2.5">
						<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold tracking-tight text-primary-foreground">
							kr
						</div>
						<h1 className="text-sm font-bold leading-tight text-foreground tracking-tight">
							Jeg vil ha pengene mine!! 💸
						</h1>
					</div>
				</div>

				{/* Month selector */}
				<div className="border-b border-border/50 px-3 py-2">
					<MonthSelector initialMonth={initialMonth} />
				</div>

				<SidebarNav />

				{/* User section */}
				<div className="border-t border-border/50 p-3">
					<div className="flex items-center gap-3 rounded-lg px-3 py-2">
						<UserAvatar name={user.name} />
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium text-foreground">
								{user.name}
							</p>
						</div>
					</div>
					<ThemeToggle />
					<form action={logout}>
						<button
							type="submit"
							className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-primary/8 hover:text-primary"
						>
							<LogOut className="h-4 w-4 flex-shrink-0" />
							Bytt bruker
						</button>
					</form>
				</div>
			</aside>

			{/* Main content area */}
			<div className="flex flex-1 flex-col min-w-0">
				{/* Top bar */}
				<header className="sticky top-0 z-30 border-b border-border/50 bg-card/95 backdrop-blur-md dark:border-border/50 dark:bg-card/90 ethereal-shadow-sm animate-header-in">
					<div className="flex items-center gap-2 px-4 py-2.5 md:gap-4 md:px-6 md:py-3">
						{/* Mobile hamburger + sidebar drawer */}
						<MobileSidebar>
							<div className="border-b border-border/50 px-3 py-2">
								<MonthSelector initialMonth={initialMonth} inline />
							</div>
							<SidebarNav />
							<div className="border-t border-border/50 p-3">
								<div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2">
									<UserAvatar name={user.name} />
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-foreground">
											{user.name}
										</p>
									</div>
								</div>
								<ThemeToggle />
								<form action={logout}>
									<button
										type="submit"
										className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-primary/8 hover:text-primary"
									>
										<LogOut className="h-4 w-4 flex-shrink-0" />
										Bytt bruker
									</button>
								</form>
							</div>
						</MobileSidebar>

						{/* Account selector — fills middle, scrollable with gradient indicator */}
						<div className="min-w-0 flex-1 overflow-hidden">
							<AccountSelector
								accounts={visibleAccounts}
								initialSelected={initialSelected}
							/>
						</div>
					</div>
				</header>

				<main className="flex-1 overflow-auto bg-background">{children}</main>
			</div>
		</div>
	);
}
