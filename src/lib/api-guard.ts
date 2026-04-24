import { NextResponse } from "next/server";

/**
 * Defense-in-depth CSRF mitigation for state-changing API routes.
 *
 * Next.js route handlers don't get the implicit Origin check that Server
 * Actions do. For POST/PUT/PATCH/DELETE handlers we compare the request's
 * `Origin` header against the resolved request origin; mismatch → 403.
 *
 * Same-origin fetches from the app always include Origin. Cross-site form
 * posts either omit Origin entirely (older browsers) or send a different
 * one — both get rejected.
 *
 * Usage (at the top of a mutating handler):
 *   const bad = assertSameOrigin(req);
 *   if (bad) return bad;
 */
export function assertSameOrigin(req: Request): NextResponse | null {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const origin = req.headers.get("origin");
  // Same-origin browser fetches always send Origin on mutating verbs.
  // A missing Origin on POST/PUT/PATCH/DELETE is suspicious — reject.
  if (!origin) {
    return NextResponse.json({ error: "Origin header required" }, { status: 403 });
  }

  let expected: string;
  try {
    expected = new URL(req.url).origin;
  } catch {
    return NextResponse.json({ error: "Invalid request URL" }, { status: 400 });
  }

  if (origin !== expected) {
    return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
  }

  return null;
}
