import { headers } from "next/headers";

/**
 * Validate CSRF protection by checking Origin header.
 * Defense-in-depth: Next.js provides automatic CSRF protection for server actions,
 * but we add explicit origin validation for sensitive financial operations.
 *
 * @throws Error if origin is invalid or missing for cross-site requests
 */
export async function validateCsrfOrigin(): Promise<void> {
	const headersList = await headers();
	const origin = headersList.get("origin");

	// If there's no origin header, it's a same-site request (OK)
	if (!origin) {
		return;
	}

	// Validate origin matches expected host
	// NextAuth v5 uses AUTH_URL; fall back to NEXTAUTH_URL for compat
	const rawUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
	if (!rawUrl) {
		if (process.env.NODE_ENV === "production") {
			throw new Error("CSRF protection: AUTH_URL is not configured");
		}
		return;
	}

	let expectedHost: string;
	try {
		expectedHost = new URL(rawUrl).host;
	} catch {
		throw new Error("CSRF protection: AUTH_URL is not a valid URL");
	}

	let incomingHost: string;
	try {
		incomingHost = new URL(origin).host;
	} catch {
		throw new Error("CSRF protection: Invalid origin format");
	}

	if (incomingHost !== expectedHost) {
		throw new Error("CSRF protection: Invalid origin");
	}
}

/**
 * Get the request origin for logging purposes (sanitized).
 */
export async function getSafeOrigin(): Promise<string | null> {
	const headersList = await headers();
	const origin = headersList.get("origin");
	if (!origin) return null;

	try {
		// Ensure it's a valid URL to prevent injection in logs
		new URL(origin);
		return origin;
	} catch {
		return "invalid-origin";
	}
}
