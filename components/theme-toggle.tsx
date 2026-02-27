"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
	onDark?: boolean;
}

export function ThemeToggle({ onDark = false }: ThemeToggleProps) {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const cls = onDark
		? "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/[0.08] hover:text-white"
		: "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white";

	if (!mounted) {
		return (
			<button type="button" className={cls}>
				<Sun className="h-4 w-4 flex-shrink-0" />
				Tema
			</button>
		);
	}

	const isDark = theme === "dark";

	return (
		<button
			type="button"
			onClick={() => setTheme(isDark ? "light" : "dark")}
			className={cls}
		>
			{isDark ? (
				<Sun key="sun" className="h-4 w-4 flex-shrink-0 animate-icon-swap" />
			) : (
				<Moon key="moon" className="h-4 w-4 flex-shrink-0 animate-icon-swap" />
			)}
			{isDark ? "Lyst tema" : "Mørkt tema"}
		</button>
	);
}
