/**
 * Simple In-Memory Rate Limiter
 *
 * Limits how many requests a single WhatsApp number can make in a time window.
 * This prevents spam from burning through OpenAI credits.
 *
 * On Vercel serverless, this resets when the function cold starts — that's fine
 * for basic protection. For production-scale, use Vercel KV or Upstash Redis.
 */

import logger from './logger';

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now > entry.resetAt) {
            store.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Check if a key (e.g. phone number) has exceeded the rate limit.
 *
 * @param key - Unique identifier (e.g. WhatsApp number)
 * @param maxRequests - Max requests allowed in the window (default: 20)
 * @param windowMs - Time window in milliseconds (default: 60 seconds)
 * @returns true if the request is allowed, false if rate-limited
 */
export function checkRateLimit(
    key: string,
    maxRequests: number = 20,
    windowMs: number = 60_000
): boolean {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
        // New window
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (entry.count >= maxRequests) {
        logger.warn(`[RateLimit] Rate limited: ${key} (${entry.count}/${maxRequests} in window)`);
        return false;
    }

    entry.count++;
    return true;
}
