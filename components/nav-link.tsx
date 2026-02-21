"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
	href: string;
	label: string;
	children: React.ReactNode;
}

export function NavLink({ href, label, children }: NavLinkProps) {
	const pathname = usePathname();
	const isActive = pathname === href || pathname.startsWith(`${href}/`);

	return (
		<Link
			href={href}
			className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
				isActive
					? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
					: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
			}`}
		>
			{children}
			{label}
		</Link>
	);
}
