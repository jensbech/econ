"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { AccountIcon } from "@/components/account-icon";

interface Account {
	id: string;
	name: string;
	type: string;
	icon: string;
}

interface AccountSelectorProps {
	accounts: Account[];
	initialSelected: string[];
}

export function AccountSelector({
	accounts,
	initialSelected,
}: AccountSelectorProps) {
	const router = useRouter();
	const [selected, setSelected] = useState<Set<string>>(
		() => new Set(initialSelected),
	);
	const [, startTransition] = useTransition();
	const hasInteracted = useRef(false);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [canScrollRight, setCanScrollRight] = useState(false);

	const publicAccounts = useMemo(
		() => accounts.filter((a) => a.type !== "private"),
		[accounts],
	);
	const privateAccounts = useMemo(
		() => accounts.filter((a) => a.type === "private"),
		[accounts],
	);

	const isAll = selected.size === 0;

	function persist(next: Set<string>) {
		const value = Array.from(next).join(",");
		const secure = window.location.protocol === "https:" ? "; Secure" : "";
		document.cookie = `selectedAccounts=${value}; path=/; max-age=7776000; SameSite=Lax${secure}`;
	}

	function apply(next: Set<string>) {
		persist(next);
		setSelected(next);
		startTransition(() => {
			router.refresh();
		});
	}

	function toggle(id: string, type: string) {
		hasInteracted.current = true;
		let next: Set<string>;
		if (selected.size === 0) {
			if (type !== "private") {
				next = new Set(
					publicAccounts.filter((a) => a.id !== id).map((a) => a.id),
				);
			} else {
				next = new Set([...publicAccounts.map((a) => a.id), id]);
			}
		} else {
			next = new Set(selected);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
		}
		apply(next);
	}

	function selectAll() {
		hasInteracted.current = true;
		apply(new Set());
	}

	function checkScroll() {
		if (scrollContainerRef.current) {
			const { scrollLeft, scrollWidth, clientWidth } =
				scrollContainerRef.current;
			setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
		}
	}

	if (accounts.length === 0) {
		return (
			<div className="flex items-center gap-3">
				<span className="text-sm text-foreground/60">
					Ingen kontoer —{" "}
				</span>
				<a
					href="/accounts"
					className="text-sm text-primary hover:underline"
				>
					opprett en konto
				</a>
			</div>
		);
	}

	const chipBase =
		"flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-all duration-200 flex-shrink-0";
	const chipActive = "border-foreground/25 bg-foreground/12 text-foreground";
	const chipInactive =
		"border-border/40 bg-transparent text-foreground/40 hover:bg-foreground/6 hover:border-border/60 hover:text-foreground/65";

	return (
		<div className="relative flex items-center gap-2">
			<div
				ref={scrollContainerRef}
				onScroll={checkScroll}
				className="flex flex-nowrap items-center gap-2 overflow-x-auto scroll-smooth md:flex-wrap"
				style={{
					scrollbarWidth: "none",
					msOverflowStyle: "none",
				}}
			>
				<button
					type="button"
					aria-pressed={isAll}
					onClick={selectAll}
					className={`${chipBase} ${isAll ? chipActive : chipInactive}`}
				>
					Alle
				</button>

				{publicAccounts.map((account) => {
					const isSelected = isAll || selected.has(account.id);
					return (
						<button
							key={account.id}
							type="button"
							aria-pressed={isSelected}
							onClick={() => toggle(account.id, account.type)}
							className={`${chipBase} ${
								isSelected ? chipActive : chipInactive
							}`}
						>
							<AccountIcon
								icon={account.icon}
								className="h-3 w-3 flex-shrink-0"
							/>
							{account.name}
						</button>
					);
				})}

				{privateAccounts.length > 0 && (
					<span className="h-5 w-px flex-shrink-0 bg-border/40" />
				)}

				{privateAccounts.map((account) => {
					const isSelected = selected.has(account.id);
					return (
						<button
							key={account.id}
							type="button"
							aria-pressed={isSelected}
							onClick={() => toggle(account.id, account.type)}
							className={`${chipBase} ${
								isSelected ? chipActive : chipInactive
							}`}
						>
							<Lock className="h-3 w-3 flex-shrink-0" />
							{account.name}
						</button>
					);
				})}
			</div>

			{canScrollRight && (
				<div className="pointer-events-none absolute right-0 h-full w-8 bg-gradient-to-l from-background via-background/80 to-transparent md:hidden" />
			)}
		</div>
	);
}
