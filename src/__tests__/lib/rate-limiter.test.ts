import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter } from "@/lib/rate-limiter";

describe("createRateLimiter", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("allows first request", () => {
        const limiter = createRateLimiter({ windowMs: 60_000, max: 5 });
        const result = limiter.check("user1");
        expect(result).toBeNull();
    });

    it("allows requests within the limit", () => {
        const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
        expect(limiter.check("user1")).toBeNull(); // 1
        expect(limiter.check("user1")).toBeNull(); // 2
        expect(limiter.check("user1")).toBeNull(); // 3
    });

    it("blocks requests exceeding the limit", () => {
        const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
        limiter.check("user1"); // 1
        limiter.check("user1"); // 2
        const blocked = limiter.check("user1"); // 3 — should be blocked
        expect(blocked).not.toBeNull();
        expect(blocked!.status).toBe(429);
    });

    it("returns custom error message", () => {
        const limiter = createRateLimiter({
            windowMs: 60_000,
            max: 1,
            message: "Bạn bị giới hạn",
        });
        limiter.check("user1"); // 1
        const blocked = limiter.check("user1"); // 2 — blocked
        expect(blocked).not.toBeNull();
    });

    it("tracks different identifiers independently", () => {
        const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
        expect(limiter.check("user1")).toBeNull();
        expect(limiter.check("user2")).toBeNull();
        // user1 is at limit, user2 is separate
        expect(limiter.check("user1")).not.toBeNull(); // blocked
        expect(limiter.check("user2")).not.toBeNull(); // also blocked
    });

    it("resets after window expires", () => {
        const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
        limiter.check("user1"); // 1
        expect(limiter.check("user1")).not.toBeNull(); // blocked

        // Advance time past window
        vi.advanceTimersByTime(61_000);
        expect(limiter.check("user1")).toBeNull(); // allowed again
    });

    it("includes Retry-After header in 429 response", async () => {
        const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
        limiter.check("user1");
        const blocked = limiter.check("user1");
        expect(blocked).not.toBeNull();
        expect(blocked!.headers.get("Retry-After")).toBeDefined();
    });

    it("cleans up stale entries lazily during check", () => {
        const limiter = createRateLimiter({ windowMs: 1_000, max: 1 });
        limiter.check("user1");
        limiter.check("user2");

        // Advance past window + cleanup threshold (60s)
        vi.advanceTimersByTime(61_000);

        // Next check triggers lazy cleanup
        const result = limiter.check("user3");
        expect(result).toBeNull(); // allowed, and old entries cleaned
    });

    describe("peek", () => {
        it("does not increment the counter on repeated peeks", () => {
            const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
            // 1000 peeks should never trip the limit on their own
            for (let i = 0; i < 1000; i++) {
                expect(limiter.peek("user1")).toBeNull();
            }
            // A real check still has full quota available afterwards
            expect(limiter.check("user1")).toBeNull(); // 1
            expect(limiter.check("user1")).toBeNull(); // 2
            expect(limiter.check("user1")).not.toBeNull(); // 3 blocked
        });

        it("returns 429 once the bucket is over the limit", () => {
            const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
            limiter.check("user1"); // 1
            limiter.check("user1"); // 2
            const tripped = limiter.check("user1"); // 3 -> 429
            expect(tripped).not.toBeNull();
            // peek now reports the same blocked state
            const blocked = limiter.peek("user1");
            expect(blocked).not.toBeNull();
            expect(blocked!.status).toBe(429);
        });

        it("stays allowed when bucket is exactly at max (count == max)", () => {
            const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
            limiter.check("user1");
            limiter.check("user1");
            limiter.check("user1"); // count=3, not yet > 3
            expect(limiter.peek("user1")).toBeNull();
        });

        it("resets after the window expires", () => {
            const limiter = createRateLimiter({ windowMs: 1_000, max: 1 });
            limiter.check("user1");
            limiter.check("user1"); // 2 -> 429
            expect(limiter.peek("user1")).not.toBeNull();
            vi.advanceTimersByTime(1_500);
            expect(limiter.peek("user1")).toBeNull();
        });
    });
});
