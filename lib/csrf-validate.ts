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
	const expectedOrigin = process.env.NEXTAUTH_URL?.split("://")[1] || "localhost";
	const incomingHost = origin.split("://")[1];

	if (incomingHost !== expectedOrigin && process.env.NODE_ENV === "production") {
		throw new Error(`CSRF protection: Invalid origin ${origin}`);
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
