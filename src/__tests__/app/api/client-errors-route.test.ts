import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function makeRequest(ip: string, body: unknown, bodyAsString = false): NextRequest {
  return new NextRequest("http://localhost/api/client-errors", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: bodyAsString ? (body as string) : JSON.stringify(body),
  });
}

describe("POST /api/client-errors", () => {
  beforeEach(() => {
    // Reset modules so each test gets a fresh in-memory rate-limit bucket.
    vi.resetModules();
  });

  it("accepts a well-formed payload and returns 200", async () => {
    const { POST } = await import("@/app/api/client-errors/route");
    const res = await POST(
      makeRequest("10.0.0.1", {
        name: "TypeError",
        message: "boom",
        scope: "dashboard",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("rejects bodies that are not JSON objects", async () => {
    const { POST } = await import("@/app/api/client-errors/route");
    const res = await POST(makeRequest("10.0.0.2", "null", true));
    expect(res.status).toBe(400);
  });

  it("rate-limits a single IP after 20 successful reports within the window", async () => {
    const { POST } = await import("@/app/api/client-errors/route");
    const ip = "10.0.0.3";
    for (let i = 0; i < 20; i++) {
      const res = await POST(
        makeRequest(ip, { message: `err ${i}`, scope: "global" }),
      );
      expect(res.status).toBe(200);
    }
    const limited = await POST(
      makeRequest(ip, { message: "err 21", scope: "global" }),
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeDefined();
  });

  it("tracks IPs independently — one IP's overflow does not block another", async () => {
    const { POST } = await import("@/app/api/client-errors/route");
    // Burn through IP A's quota + get it blocked
    for (let i = 0; i < 21; i++) {
      await POST(makeRequest("10.0.0.4", { message: "a", scope: "global" }));
    }
    // IP B should still be clean
    const res = await POST(
      makeRequest("10.0.0.5", { message: "b", scope: "global" }),
    );
    expect(res.status).toBe(200);
  });

  it("uses the first entry when x-forwarded-for contains a proxy chain", async () => {
    const { POST } = await import("@/app/api/client-errors/route");
    const clientIp = "10.0.0.6";
    // Two requests from the same client but forwarded through different proxies.
    // The route must read the first hop (the original client) so both count
    // against the same bucket.
    const first = await POST(
      new NextRequest("http://localhost/api/client-errors", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": `${clientIp}, 172.16.0.1`,
        },
        body: JSON.stringify({ message: "hop-a", scope: "global" }),
      }),
    );
    const second = await POST(
      new NextRequest("http://localhost/api/client-errors", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": `${clientIp}, 172.16.0.2`,
        },
        body: JSON.stringify({ message: "hop-b", scope: "global" }),
      }),
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // Confirm that 19 more hits from the same IP but different proxies land on
    // the same bucket and trip the limit.
    for (let i = 0; i < 18; i++) {
      await POST(
        new NextRequest("http://localhost/api/client-errors", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": `${clientIp}, 172.16.0.${3 + i}`,
          },
          body: JSON.stringify({ message: `hop-${i}`, scope: "global" }),
        }),
      );
    }
    const tripped = await POST(
      new NextRequest("http://localhost/api/client-errors", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": `${clientIp}, 172.16.0.99`,
        },
        body: JSON.stringify({ message: "overflow", scope: "global" }),
      }),
    );
    expect(tripped.status).toBe(429);
  });
});
