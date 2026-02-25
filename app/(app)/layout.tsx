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
					<NavLink key={href} href={href} label={label} onDark>
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
		<div className="flex min-h-screen bg-[#F5F3EF] dark:bg-gray-950">
			{/* Desktop Sidebar — always dark */}
			<aside className="hidden w-60 flex-shrink-0 flex-col bg-[#0C0E14] md:flex">
				<div className="border-b border-white/[0.06] px-5 py-4">
					<div className="flex items-center gap-2.5">
						<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-bold tracking-tight text-white">
							kr
						</div>
						<h1 className="text-sm font-semibold leading-tight text-white">
							Pengene mine
						</h1>
					</div>
				</div>

				<SidebarNav />

				{/* User section */}
				<div className="border-t border-white/[0.06] p-3">
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
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">
								{(user.name ?? "?")[0].toUpperCase()}
							</div>
						)}
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium text-white">
								{user.name}
							</p>
							<p className="truncate text-xs text-gray-400">
								{user.email}
							</p>
						</div>
					</div>
					<ThemeToggle onDark />
					<form
						action={async () => {
							"use server";
							await signOut({ redirectTo: "/" });
						}}
					>
						<button
							type="submit"
							className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white"
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
				<header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200/70 bg-white/90 px-4 py-3 backdrop-blur-md md:px-6 dark:border-gray-800 dark:bg-gray-900/90">
					{/* Mobile hamburger + sidebar drawer */}
					<MobileSidebar>
						<SidebarNav />
						<div className="border-t border-white/[0.06] p-3">
							<ThemeToggle onDark />
						</div>
					</MobileSidebar>

					{/* Month selector */}
					<MonthSelector initialMonth={initialMonth} />

					{/* Account selector */}
					<div className="flex-1 overflow-x-auto">
						<AccountSelector
							accounts={visibleAccounts}
							initialSelected={initialSelected}
						/>
					</div>
				</header>

				<main className="flex-1 overflow-auto">{children}</main>
			</div>
		</div>
	);
}
