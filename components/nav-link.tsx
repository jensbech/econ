"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
	href: string;
	label: string;
	children: React.ReactNode;
	onDark?: boolean;
}

export function NavLink({ href, label, children, onDark = false }: NavLinkProps) {
	const pathname = usePathname();
	const isActive = pathname === href || pathname.startsWith(`${href}/`);

	return (
		<Link
			href={href}
			className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
				onDark
					? isActive
						? "bg-indigo-600 text-white"
						: "text-gray-400 hover:bg-white/[0.08] hover:text-white"
					: isActive
					? "bg-indigo-600 text-white hover:bg-indigo-600 dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-500"
					: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
			}`}
		>
			{children}
			{label}
		</Link>
	);
}
