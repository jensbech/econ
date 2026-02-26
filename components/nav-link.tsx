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
			aria-current={isActive ? "page" : undefined}
			className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
				isActive
					? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary"
					: "text-foreground/60 hover:bg-primary/8 hover:text-primary dark:text-foreground/70 dark:hover:bg-primary/10 dark:hover:text-primary"
			}`}
		>
			{children}
			{label}
		</Link>
	);
}
