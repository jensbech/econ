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
		persist(next); // cookie written synchronously before refresh
		setSelected(next);
		startTransition(() => {
			router.refresh();
		});
	}

	function toggle(id: string, type: string) {
		hasInteracted.current = true;
		let next: Set<string>;
		if (selected.size === 0) {
			// "Alle" mode: switching to explicit selection
			if (type !== "private") {
				// Deselect this public account, keep all other public ones active
				next = new Set(
					publicAccounts.filter((a) => a.id !== id).map((a) => a.id),
				);
			} else {
				// Add this private account on top of all public ones
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

	if (accounts.length === 0) {
		return (
			<div className="flex items-center gap-3">
				<span className="text-sm text-gray-500 dark:text-gray-400">
					Ingen kontoer -{" "}
				</span>
				<a
					href="/accounts"
					className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
				>
					opprett en konto
				</a>
			</div>
		);
	}

	const chipBase =
		"flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors";
	const chipActive =
		"border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-600";
	const chipInactive =
		"border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-700";

	return (
		<div className="flex flex-wrap items-center gap-2">
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
						className={`${chipBase} ${isSelected ? chipActive : chipInactive}`}
					>
						<AccountIcon icon={account.icon} className="h-3 w-3 flex-shrink-0" />
						{account.name}
					</button>
				);
			})}

			{privateAccounts.length > 0 && (
				<span className="h-5 w-px bg-gray-300 dark:bg-gray-600" />
			)}

			{privateAccounts.map((account) => {
				const isSelected = selected.has(account.id);
				return (
					<button
						key={account.id}
						type="button"
						aria-pressed={isSelected}
						onClick={() => toggle(account.id, account.type)}
						className={`${chipBase} ${isSelected ? chipActive : chipInactive}`}
					>
						<Lock className="h-3 w-3 flex-shrink-0" />
						{account.name}
					</button>
				);
			})}
		</div>
	);
}
