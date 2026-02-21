import {
	BarChart3,
	Calculator,
	CreditCard,
	Import,
	LayoutDashboard,
	LineChart,
	LogOut,
	PiggyBank,
	Settings,
	TrendingUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

const navItems = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/expenses", label: "Utgifter", icon: CreditCard },
	{ href: "/income", label: "Inntekt", icon: TrendingUp },
	{ href: "/loans", label: "Lån", icon: BarChart3 },
	{ href: "/savings", label: "Sparing", icon: PiggyBank },
	{ href: "/charts", label: "Grafer", icon: LineChart },
	{ href: "/calculator", label: "Kalkulator", icon: Calculator },
	{ href: "/import", label: "Importer", icon: Import },
	{ href: "/settings/categories", label: "Kategorier", icon: Settings },
];

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();
	if (!session?.user) redirect("/");

	const user = session.user;

	return (
		<div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
			{/* Sidebar */}
			<aside className="flex w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
				{/* Logo / App name */}
				<div className="border-b border-gray-200 px-5 py-5 dark:border-gray-800">
					<h1 className="text-sm font-semibold leading-tight text-gray-900 dark:text-white">
						Jeg vil ha pengene mine!
					</h1>
				</div>

				{/* Navigation */}
				<nav className="flex-1 space-y-0.5 px-3 py-4">
					{navItems.map(({ href, label, icon: Icon }) => (
						<Link
							key={href}
							href={href}
							className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
						>
							<Icon className="h-4 w-4 flex-shrink-0" />
							{label}
						</Link>
					))}
				</nav>

				{/* User section */}
				<div className="border-t border-gray-200 p-3 dark:border-gray-800">
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
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
								{(user.name ?? "?")[0].toUpperCase()}
							</div>
						)}
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium text-gray-900 dark:text-white">
								{user.name}
							</p>
							<p className="truncate text-xs text-gray-500 dark:text-gray-400">
								{user.email}
							</p>
						</div>
					</div>
					<form
						action={async () => {
							"use server";
							await signOut({ redirectTo: "/" });
						}}
					>
						<button
							type="submit"
							className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
						>
							<LogOut className="h-4 w-4 flex-shrink-0" />
							Logg ut
						</button>
					</form>
				</div>
			</aside>

			{/* Main content */}
			<main className="flex-1 overflow-auto">{children}</main>
		</div>
	);
}
