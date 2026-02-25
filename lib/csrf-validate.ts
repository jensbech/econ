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

	// Validate origin matches expected host.
	// Prefer explicit env var; fall back to the Host header (set by nginx-proxy).
	const rawUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
	let expectedHost: string;
	if (rawUrl) {
		try {
			expectedHost = new URL(rawUrl).host;
		} catch {
			throw new Error("CSRF protection: AUTH_URL is not a valid URL");
		}
	} else {
		const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
		if (!host) {
			if (process.env.NODE_ENV === "production") {
				throw new Error("CSRF protection: cannot determine expected host");
			}
			return;
		}
		expectedHost = host.split(",")[0].trim();
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
