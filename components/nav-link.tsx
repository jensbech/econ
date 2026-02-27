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
			className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
				isActive
					? "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary"
					: "text-foreground/60 hover:bg-primary/8 hover:text-primary dark:text-foreground/70 dark:hover:bg-primary/10 dark:hover:text-primary"
			}`}
		>
			<span
				aria-hidden="true"
				className={`absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 ease-out ${
					isActive ? "h-5 opacity-100" : "h-0 opacity-0"
				}`}
			/>
			<span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-px">
				{children}
			</span>
			{label}
		</Link>
	);
}
