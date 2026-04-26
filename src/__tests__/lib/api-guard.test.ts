import { describe, expect, it } from "vitest";

import { assertSameOrigin } from "@/lib/api-guard";

function makeReq(
  method: string,
  url: string,
  origin?: string | null,
  extraHeaders: Record<string, string> = {},
): Request {
  const headers = new Headers();
  if (origin !== null && origin !== undefined) headers.set("origin", origin);
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }
  return new Request(url, { method, headers });
}

describe("assertSameOrigin", () => {
  it("allows safe verbs without checking origin", async () => {
    expect(assertSameOrigin(makeReq("GET", "https://app.local/api/x"))).toBeNull();
    expect(assertSameOrigin(makeReq("HEAD", "https://app.local/api/x"))).toBeNull();
    expect(assertSameOrigin(makeReq("OPTIONS", "https://app.local/api/x"))).toBeNull();
  });

  it("allows mutating verbs when origin matches request URL", () => {
    const res = assertSameOrigin(
      makeReq("POST", "https://app.local/api/x", "https://app.local"),
    );
    expect(res).toBeNull();
  });

  it("allows mutating verbs when origin matches forwarded deployment host", () => {
    const res = assertSameOrigin(
      makeReq("POST", "http://127.0.0.1:3000/api/orders/upload", "https://huyhoang.express", {
        "x-forwarded-host": "huyhoang.express",
        "x-forwarded-proto": "https",
      }),
    );
    expect(res).toBeNull();
  });

  it("allows mutating verbs when origin matches configured app URL", () => {
    process.env.APP_URL = "https://orders.example.com";
    try {
      const res = assertSameOrigin(
        makeReq("POST", "http://127.0.0.1:3000/api/orders/upload", "https://orders.example.com"),
      );
      expect(res).toBeNull();
    } finally {
      delete process.env.APP_URL;
    }
  });

  it("rejects mutating verbs when origin is missing", async () => {
    const res = assertSameOrigin(makeReq("POST", "https://app.local/api/x", null));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("rejects mutating verbs when origin is foreign", async () => {
    const res = assertSameOrigin(
      makeReq("DELETE", "https://app.local/api/x", "https://evil.example"),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("treats PUT and PATCH as mutating", async () => {
    expect(assertSameOrigin(makeReq("PUT", "https://app.local/api/x", null))?.status).toBe(403);
    expect(assertSameOrigin(makeReq("PATCH", "https://app.local/api/x", null))?.status).toBe(403);
  });

  it("is case-insensitive on method", async () => {
    expect(assertSameOrigin(makeReq("post", "https://app.local/api/x", null))?.status).toBe(403);
  });
});
