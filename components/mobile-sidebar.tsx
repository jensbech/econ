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
				className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground/60 transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:scale-110 dark:text-foreground/70 dark:hover:bg-primary/10 dark:hover:text-primary md:hidden"
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
						{/* Backdrop - always rendered, fades in/out */}
						<div
							className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-300 ease-out ${
								open
									? "opacity-100 pointer-events-auto"
									: "opacity-0 pointer-events-none"
							}`}
							onClick={() => setOpen(false)}
							aria-hidden="true"
						/>

						{/* Drawer */}
						<aside
							id="mobile-sidebar-drawer"
							aria-hidden={!open}
							className={`fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:hidden ${
								open ? "translate-x-0" : "-translate-x-full"
							}`}
						>
							<div className="flex h-full flex-col bg-card dark:bg-card border-r border-border/40">
								{/* Header */}
								<div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
									<div className="flex items-center gap-2.5">
										<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold tracking-tight text-white">
											kr
										</div>
										<h1 className="text-sm font-semibold leading-tight text-foreground">
											Pengene mine
										</h1>
									</div>
									<button
										type="button"
										onClick={() => setOpen(false)}
										className="rounded-lg p-1 text-foreground/60 transition-all duration-200 hover:bg-primary/10 hover:text-primary hover:rotate-90"
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
