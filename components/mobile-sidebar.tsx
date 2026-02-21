"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

interface MobileSidebarProps {
	children: React.ReactNode;
}

export function MobileSidebar({ children }: MobileSidebarProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			{/* Hamburger button - visible only on mobile */}
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 md:hidden"
				aria-label="Åpne meny"
			>
				<Menu className="h-5 w-5" />
			</button>

			{/* Backdrop */}
			{open && (
				<div
					className="fixed inset-0 z-40 bg-black/50 md:hidden"
					onClick={() => setOpen(false)}
					onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
				/>
			)}

			{/* Drawer */}
			<aside
				className={`fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 ease-in-out md:hidden ${
					open ? "translate-x-0" : "-translate-x-full"
				}`}
			>
				<div className="flex h-full flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
					{/* Close button */}
					<div className="flex items-center justify-between border-b border-gray-200 px-5 py-5 dark:border-gray-800">
						<h1 className="text-sm font-semibold leading-tight text-gray-900 dark:text-white">
							Jeg vil ha pengene mine!
						</h1>
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
							aria-label="Lukk meny"
						>
							<X className="h-4 w-4" />
						</button>
					</div>

					{/* Nav content (injected from layout) */}
					<div onClick={() => setOpen(false)} className="flex-1 overflow-y-auto">
						{children}
					</div>
				</div>
			</aside>
		</>
	);
}
