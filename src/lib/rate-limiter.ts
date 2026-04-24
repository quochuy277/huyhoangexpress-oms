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

  function overLimitResponse(resetAt: number, now: number): NextResponse {
    const retryAfter = Math.ceil((resetAt - now) / 1000);
    return NextResponse.json(
      { error: message },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  return {
    /**
     * Check if the identifier is rate-limited.
     * Returns a NextResponse (429) if limited, or null if allowed.
     * Always increments the counter for the identifier.
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
        return overLimitResponse(record.resetAt, now);
      }

      return null;
    },

    /**
     * Read-only check: returns 429 if the bucket is already over the limit
     * without incrementing. Use together with {@link check} on the failure
     * path when you only want to count failures (e.g., login attempts) and
     * avoid throttling legitimate users who share an IP.
     */
    peek(identifier: string): NextResponse | null {
      const now = Date.now();
      const record = hits.get(identifier);
      if (!record || now > record.resetAt) return null;
      if (record.count > max) {
        return overLimitResponse(record.resetAt, now);
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

/** Generic write rate limit: 30 state-changing requests per user per minute */
export const writeLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  message: "Quá nhiều thao tác. Vui lòng thử lại sau.",
});

/** Sensitive write: 5 per minute per user (password change, force-logout, etc.) */
export const sensitiveWriteLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 5,
  message: "Quá nhiều lần thử. Vui lòng chờ 1 phút rồi thử lại.",
});

/** Client error ingestion: 20 reports/min per IP. Origin check in proxy.ts is
 *  spoofable by scripted clients, so this prevents log-flooding by any caller
 *  that can set `Origin` to our site.  */
export const clientErrorLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  message: "Too many client error reports.",
});
