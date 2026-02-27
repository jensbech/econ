"use server";

import { and, eq, isNull, sql } from "drizzle-orm";

const VALID_KINDS = ["checking", "savings", "credit", "investment", "crypto"] as const;
const MAX_ACCOUNTS = 50;
const ICON_RE = /^[a-z][a-z0-9-]{0,49}$/;
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { verifySession } from "@/lib/dal";
import { getHouseholdId } from "@/lib/households";
import { checkRateLimit } from "@/lib/rate-limit";
import { logCreate, logUpdate, logDelete } from "@/lib/audit";
import { validateCsrfOrigin } from "@/lib/csrf-validate";
import { nokToOere } from "@/lib/server-utils";

export async function createAccount(
	name: string,
	type: "public" | "private",
	icon: string = "wallet",
	accountNumber?: string,
	kind: string = "checking",
	openingBalanceNOK?: string,
	openingBalanceDate?: string,
	coinSymbol?: string,
	coinQuantity?: string,
): Promise<string | undefined> {
	// CSRF protection
	await validateCsrfOrigin();

	const user = await verifySession();
	if (!user.id) return "Bruker-ID ikke tilgjengelig";

	try {
		await checkRateLimit(`account:create:${user.id}`, 5, 60);
	} catch {
		return "For mange forespørsler. Prøv igjen senere.";
	}

	const householdId = await getHouseholdId(user.id);
	if (!householdId) return "Ingen husholdning funnet";

	// Validate kind and icon (MED-12)
	if (!VALID_KINDS.includes(kind as (typeof VALID_KINDS)[number])) {
		return "Ugyldig kontotype";
	}
	if (!ICON_RE.test(icon)) {
		return "Ugyldig ikon";
	}

	if (name.trim().length > 100) return "Kontonavn kan ikke være lengre enn 100 tegn";

	const trimmedAccountNumber = accountNumber?.trim() || null;

	// Validate account number format if provided (Norwegian format: XXXX.XX.XXXXX)
	if (trimmedAccountNumber && !/^\d{4}\.\d{2}\.\d{5}$/.test(trimmedAccountNumber)) {
		return "Kontonummer må være på formatet XXXX.XX.XXXXX (f.eks. 1234.56.78901)";
	}

	let openingBalanceOere: number | null = null;
	const parsedOpeningBalanceDate: string | null = openingBalanceDate?.trim() || null;
	if (kind !== "crypto" && openingBalanceNOK?.trim()) {
		try {
			openingBalanceOere = nokToOere(openingBalanceNOK.trim());
		} catch {
			return "Ugyldig inngående saldo";
		}
	}

	let parsedCoinQuantity: number | null = null;
	if (kind === "crypto") {
		if (!coinQuantity?.trim()) return "Antall coins er påkrevd for krypto-konto";
		const qty = Number(coinQuantity.replace(",", "."));
		if (Number.isNaN(qty) || qty <= 0) return "Ugyldig mengde";
		if (qty > 1_000_000_000) return "Mengde er for stor";
		parsedCoinQuantity = qty;
	}

	if (coinSymbol && kind === "crypto" && !/^[A-Z]{1,10}$/.test(coinSymbol)) {
		return "Ugyldig myntsymbol";
	}

	// Enforce account count cap (MED-10)
	const [{ cnt }] = await db
		.select({ cnt: sql<number>`count(*)::int` })
		.from(accounts)
		.where(and(eq(accounts.householdId, householdId), isNull(accounts.deletedAt)));
	if (cnt >= MAX_ACCOUNTS) return `Maks ${MAX_ACCOUNTS} kontoer per husholdning`;

	const [inserted] = await db
		.insert(accounts)
		.values({
			householdId,
			userId: user.id,
			name: name.trim(),
			type,
			kind,
			icon,
			accountNumber: trimmedAccountNumber,
			openingBalanceOere,
			openingBalanceDate: parsedOpeningBalanceDate,
			coinSymbol: kind === "crypto" ? (coinSymbol ?? "BTC") : null,
			coinQuantity: parsedCoinQuantity,
		})
		.returning({ id: accounts.id });

	// Log the account creation
	await logCreate(householdId, user.id, "account", inserted.id, {
		name: name.trim(),
		type,
		kind,
		icon,
	});

	revalidatePath("/accounts");
}

export async function updateAccount(
	id: string,
	name: string,
	icon?: string,
	accountNumber?: string | null,
	kind?: string,
	openingBalanceNOK?: string,
	openingBalanceDate?: string,
	coinSymbol?: string,
	coinQuantity?: string,
): Promise<string | undefined> {
	// CSRF protection
	await validateCsrfOrigin();

	const user = await verifySession();
	if (!user.id) return "Bruker-ID ikke tilgjengelig";

	try {
		await checkRateLimit(`account:update:${user.id}`, 10, 60);
	} catch {
		return "For mange forespørsler. Prøv igjen senere.";
	}

	const householdId = await getHouseholdId(user.id);
	if (!householdId) return "Ingen husholdning funnet";

	// AUTHORIZATION: Verify account exists and belongs to the user
	const [account] = await db
		.select({ id: accounts.id })
		.from(accounts)
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.householdId, householdId),
				eq(accounts.userId, user.id),
				isNull(accounts.deletedAt),
			),
		)
		.limit(1);

	if (!account) {
		return "Konto ikke funnet eller ikke tilgang";
	}

	const trimmedAccountNumber = accountNumber?.trim() || null;

	// Validate account number format if provided
	if (trimmedAccountNumber && !/^\d{4}\.\d{2}\.\d{5}$/.test(trimmedAccountNumber)) {
		return "Kontonummer må være på formatet XXXX.XX.XXXXX (f.eks. 1234.56.78901)";
	}

	let openingBalanceOere: number | null | undefined = undefined;
	const parsedUpdateOpeningBalanceDate: string | null | undefined =
		openingBalanceDate !== undefined ? openingBalanceDate.trim() || null : undefined;
	if (openingBalanceNOK !== undefined) {
		if (openingBalanceNOK.trim()) {
			try {
				openingBalanceOere = nokToOere(openingBalanceNOK.trim());
			} catch {
				return "Ugyldig inngående saldo";
			}
		} else {
			openingBalanceOere = null;
		}
	}

	if (name.trim().length > 100) return "Kontonavn kan ikke være lengre enn 100 tegn";

	// Validate kind and icon if provided (MED-12)
	if (icon && !ICON_RE.test(icon)) return "Ugyldig ikon";
	if (kind && !VALID_KINDS.includes(kind as (typeof VALID_KINDS)[number])) {
		return "Ugyldig kontotype";
	}

	let parsedUpdateCoinQuantity: number | null | undefined = undefined;
	if (kind === "crypto" && coinQuantity !== undefined) {
		if (!coinQuantity.trim()) return "Antall coins er påkrevd for krypto-konto";
		const qty = Number(coinQuantity.replace(",", "."));
		if (Number.isNaN(qty) || qty <= 0) return "Ugyldig mengde";
		if (qty > 1_000_000_000) return "Mengde er for stor";
		parsedUpdateCoinQuantity = qty;
	}

	if (coinSymbol && kind === "crypto" && !/^[A-Z]{1,10}$/.test(coinSymbol)) {
		return "Ugyldig myntsymbol";
	}

	const set: Record<string, string | number | null> = { name: name.trim() };
	if (icon) set.icon = icon;
	if (accountNumber !== undefined) set.accountNumber = trimmedAccountNumber;
	if (kind) set.kind = kind;
	if (kind !== "crypto" && openingBalanceOere !== undefined) set.openingBalanceOere = openingBalanceOere;
	if (kind !== "crypto" && parsedUpdateOpeningBalanceDate !== undefined) set.openingBalanceDate = parsedUpdateOpeningBalanceDate;
	if (kind === "crypto" && coinSymbol) set.coinSymbol = coinSymbol;
	if (kind === "crypto" && parsedUpdateCoinQuantity !== undefined) set.coinQuantity = parsedUpdateCoinQuantity;

	await db
		.update(accounts)
		.set(set)
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.householdId, householdId),
				eq(accounts.userId, user.id),
				isNull(accounts.deletedAt),
			),
		);

	// Log the update
	await logUpdate(householdId, user.id, "account", id, set);

	revalidatePath("/accounts");
}

export async function deleteAccount(id: string): Promise<string | undefined> {
	// CSRF protection
	await validateCsrfOrigin();

	const user = await verifySession();
	if (!user.id) return "Bruker-ID ikke tilgjengelig";

	try {
		await checkRateLimit(`account:delete:${user.id}`, 5, 60);
	} catch {
		return "For mange forespørsler. Prøv igjen senere.";
	}

	const householdId = await getHouseholdId(user.id);
	if (!householdId) return "Ingen husholdning funnet";

	// AUTHORIZATION: Verify account exists and belongs to the user
	const [account] = await db
		.select({ id: accounts.id })
		.from(accounts)
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.householdId, householdId),
				eq(accounts.userId, user.id),
				isNull(accounts.deletedAt),
			),
		)
		.limit(1);

	if (!account) {
		return "Konto ikke funnet eller ikke tilgang";
	}

	await db
		.update(accounts)
		.set({ deletedAt: new Date() })
		.where(
			and(
				eq(accounts.id, id),
				eq(accounts.householdId, householdId),
				eq(accounts.userId, user.id),
				isNull(accounts.deletedAt),
			),
		);

	// Log the deletion
	await logDelete(householdId, user.id, "account", id, "User initiated deletion");

	revalidatePath("/accounts");
}
