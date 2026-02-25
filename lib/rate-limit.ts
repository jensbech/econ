/**
 * In-memory rate limiter with time-based buckets.
 *
 * ⚠️ PRODUCTION NOTE: This implementation is NOT suitable for distributed systems.
 * - Each server instance maintains its own rate limit state
 * - Horizontal scaling bypasses limits (request spread across instances)
 * - Server restarts lose all rate limit state
 *
 * For production environments with multiple instances, use Redis:
 *   npm install redis
 *   const redis = await createClient().connect();
 *   const result = await redis.incr(key);
 *   if (result === 1) await redis.expire(key, windowSeconds);
 *   if (result > maxRequests) throw error;
 */

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

const limits = new Map<string, RateLimitEntry>();
let instanceWarningLogged = false;

/**
 * Check if an action is within rate limit.
 * @param key - Unique identifier (e.g., "expense:user-id")
 * @param maxRequests - Maximum requests allowed
 * @param windowSeconds - Time window in seconds
 * @throws Error if rate limit exceeded
 */
export function checkRateLimit(
	key: string,
	maxRequests: number = 10,
	windowSeconds: number = 60,
): void {
	// Log warning once on startup about distributed limitations
	if (!instanceWarningLogged && process.env.NODE_ENV === "production") {
		const instanceId = process.env.HOSTNAME || "unknown";
		console.warn(
			`[Rate Limit] Using in-memory limiter on instance ${instanceId}. ` +
			"Not suitable for horizontal scaling. Consider Redis for production.",
		);
		instanceWarningLogged = true;
	}

	const now = Date.now();
	const entry = limits.get(key);

	if (!entry || now > entry.resetTime) {
		// New bucket
		limits.set(key, { count: 1, resetTime: now + windowSeconds * 1000 });
		return;
	}

	// Within existing bucket
	if (entry.count >= maxRequests) {
		throw new Error("Rate limit exceeded. Please try again later.");
	}

	entry.count++;
}

/**
 * Check rate limit as a Promise (for use in async functions).
 */
export async function checkRateLimitAsync(
	key: string,
	maxRequests: number = 10,
	windowSeconds: number = 60,
): Promise<void> {
	checkRateLimit(key, maxRequests, windowSeconds);
}

/**
 * Clean up old entries to prevent memory leaks.
 * Call this periodically (e.g., every hour).
 */
export function cleanupOldEntries(): void {
	const now = Date.now();
	for (const [key, entry] of limits.entries()) {
		if (now > entry.resetTime) {
			limits.delete(key);
		}
	}
}

// Cleanup every hour
setInterval(() => {
	cleanupOldEntries();
}, 60 * 60 * 1000);
