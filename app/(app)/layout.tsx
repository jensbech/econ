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
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AccountSelector } from "@/components/account-selector";
import { MonthSelector } from "@/components/month-selector";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { NavLink } from "@/components/nav-link";
import { ThemeToggle } from "@/components/theme-toggle";
import { getVisibleAccounts } from "@/lib/accounts";
import { getHouseholdId } from "@/lib/households";

const navItems = [
	{ href: "/dashboard", label: "Oversikt", icon: LayoutDashboard },
	{ href: "/expenses", label: "Utgifter", icon: CreditCard },
	{ href: "/income", label: "Inntekt", icon: TrendingUp },
	{ href: "/loans", label: "Lån", icon: BarChart3 },
	{ href: "/savings", label: "Sparing", icon: PiggyBank },
	{ href: "/accounts", label: "Kontoer", icon: Landmark },
	{ href: "/import", label: "Importer", icon: Import },
	{ href: "/settings/categories", label: "Kategorier", icon: Settings },
	{ href: "/guide", label: "Brukerveiledning", icon: HelpCircle },
];

function SidebarNav() {
	return (
		<>
			<nav className="flex-1 space-y-0.5 px-3 py-4">
				{navItems.map(({ href, label, icon: Icon }) => (
					<NavLink key={href} href={href} label={label}>
						<Icon className="h-4 w-4 flex-shrink-0" />
					</NavLink>
				))}
			</nav>
		</>
	);
}

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();
	if (!session?.user) redirect("/");

	const user = session.user;

	const householdId = await getHouseholdId(user.id as string);

	const visibleAccounts = householdId
		? await getVisibleAccounts(user.id as string, householdId)
		: [];

	const cookieStore = await cookies();
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
			<aside className="hidden w-60 flex-shrink-0 flex-col bg-background dark:bg-card md:flex border-r border-border/40 animate-sidebar-in">
				<div className="border-b border-border/40 px-5 py-4">
					<div className="flex items-center gap-2.5">
						<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold tracking-tight text-card-foreground">
							kr
						</div>
						<h1 className="text-sm font-semibold leading-tight text-foreground">
							Pengene mine
						</h1>
					</div>
				</div>

				{/* Month selector */}
				<div className="border-b border-border/40 px-3 py-2">
					<MonthSelector initialMonth={initialMonth} />
				</div>

				<SidebarNav />


				{/* User section */}
				<div className="border-t border-border/40 p-3">
					<div className="flex items-center gap-3 rounded-lg px-3 py-2">
						{user.image ? (
							<Image
								src={user.image}
								alt={user.name ?? ""}
								width={32}
								height={32}
								className="rounded-full object-cover"
							/>
						) : (
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
								{(user.name ?? "?")[0].toUpperCase()}
							</div>
						)}
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium text-foreground">
								{user.name}
							</p>
							<p className="truncate text-xs text-foreground/60">
								{user.email}
							</p>
						</div>
					</div>
					<ThemeToggle />
					<form
						action={async () => {
							"use server";
							await signOut({ redirectTo: "/" });
						}}
					>
						<button
							type="submit"
							className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-primary/8 hover:text-primary"
						>
							<LogOut className="h-4 w-4 flex-shrink-0" />
							Logg ut
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
							<div className="border-b border-border/40 px-3 py-2">
								<MonthSelector initialMonth={initialMonth} inline />
							</div>
							<SidebarNav />
							<div className="border-t border-border/40 p-3">
								<div className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2">
									{user.image ? (
										<Image
											src={user.image}
											alt={user.name ?? ""}
											width={32}
											height={32}
											className="rounded-full object-cover"
										/>
									) : (
										<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
											{(user.name ?? "?")[0].toUpperCase()}
										</div>
									)}
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-foreground">
											{user.name}
										</p>
										<p className="truncate text-xs text-foreground/60">
											{user.email}
										</p>
									</div>
								</div>
								<ThemeToggle />
								<form
									action={async () => {
										"use server";
										await signOut({ redirectTo: "/" });
									}}
								>
									<button
										type="submit"
										className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-primary/8 hover:text-primary"
									>
										<LogOut className="h-4 w-4 flex-shrink-0" />
										Logg ut
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
