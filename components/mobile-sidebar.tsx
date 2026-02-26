"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface MobileSidebarProps {
	children: React.ReactNode;
}

export function MobileSidebar({ children }: MobileSidebarProps) {
	const [open, setOpen] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Escape key + scroll lock when drawer is open
	useEffect(() => {
		if (!open) return;
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.body.style.overflow = prevOverflow;
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [open]);

	return (
		<>
			{/* Hamburger button - visible only on mobile */}
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 md:hidden"
				aria-label="Åpne meny"
				aria-expanded={open}
				aria-controls="mobile-sidebar-drawer"
			>
				<Menu className="h-5 w-5" />
			</button>

			{/* Portal drawer + backdrop to document.body to escape backdrop-filter containing block */}
			{mounted &&
				createPortal(
					<>
						{/* Backdrop */}
						{open && (
							<div
								className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
								onClick={() => setOpen(false)}
								aria-hidden="true"
							/>
						)}

						{/* Drawer */}
						<aside
							id="mobile-sidebar-drawer"
							aria-hidden={!open}
							className={`fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 ease-in-out md:hidden ${
								open ? "translate-x-0" : "-translate-x-full"
							}`}
						>
							<div className="flex h-full flex-col bg-[#0C0E14]">
								{/* Header */}
								<div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
									<div className="flex items-center gap-2.5">
										<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-indigo-600 text-[11px] font-bold tracking-tight text-white">
											kr
										</div>
										<h1 className="text-sm font-semibold leading-tight text-white">
											Pengene mine
										</h1>
									</div>
									<button
										type="button"
										onClick={() => setOpen(false)}
										className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
										aria-label="Lukk meny"
									>
										<X className="h-4 w-4" />
									</button>
								</div>

								{/* Nav content (injected from layout) */}
								<div
									onClick={() => setOpen(false)}
									className="flex flex-1 flex-col overflow-y-auto"
								>
									{children}
								</div>
							</div>
						</aside>
					</>,
					document.body,
				)}
		</>
	);
}
