import { NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter for API routes.
 * For production with multiple instances, swap for @upstash/ratelimit + Redis.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
 *   // In route handler:
 *   const blocked = limiter.check(identifier);
 *   if (blocked) return blocked;
 */

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Max requests per window */
  max: number;
  /** Error message */
  message?: string;
}

interface HitRecord {
  count: number;
  resetAt: number;
}

export function createRateLimiter(opts: RateLimiterOptions) {
  const { windowMs, max, message = "Quá nhiều yêu cầu, vui lòng thử lại sau." } = opts;
  const hits = new Map<string, HitRecord>();
  let lastCleanup = Date.now();

  return {
    /**
     * Check if the identifier is rate-limited.
     * Returns a NextResponse (429) if limited, or null if allowed.
     */
    check(identifier: string): NextResponse | null {
      const now = Date.now();

      // Lazy cleanup: remove stale entries every 60s (no setInterval leak)
      if (now - lastCleanup > 60_000) {
        for (const [key, record] of hits) {
          if (now > record.resetAt) hits.delete(key);
        }
        lastCleanup = now;
      }

      const record = hits.get(identifier);

      if (!record || now > record.resetAt) {
        hits.set(identifier, { count: 1, resetAt: now + windowMs });
        return null;
      }

      record.count++;
      if (record.count > max) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);
        return NextResponse.json(
          { error: message },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfter) },
          }
        );
      }

      return null;
    },
  };
}

// Pre-built limiters for common use cases
/** Login: 5 attempts per minute per IP */
export const loginLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  message: "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 1 phút.",
});

/** Upload: 10 uploads per minute per user */
export const uploadLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 10,
  message: "Quá nhiều lần tải lên. Vui lòng thử lại sau.",
});

/** Export: 5 exports per minute per user */
export const exportLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  message: "Quá nhiều lần xuất file. Vui lòng thử lại sau.",
});

/** Auto-import: 15 per minute */
export const autoImportLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 15,
  message: "Quá nhiều yêu cầu auto-import. Vui lòng thử lại sau.",
});
