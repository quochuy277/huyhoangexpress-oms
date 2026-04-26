import { NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function firstHeaderValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function addOrigin(origins: Set<string>, value: string | null | undefined) {
  if (!value) return;

  try {
    origins.add(new URL(value).origin);
  } catch {
    // Ignore malformed deployment config/header values.
  }
}

function addHostOrigin(origins: Set<string>, protocol: string, host: string | null) {
  if (!host) return;

  const normalizedProtocol = protocol.replace(/:$/, "") || "https";
  addOrigin(origins, `${normalizedProtocol}://${host}`);
}

export function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

export function getTrustedRequestOrigins(req: Request): Set<string> {
  const origins = new Set<string>();
  let requestUrl: URL;

  try {
    requestUrl = new URL(req.url);
    origins.add(requestUrl.origin);
  } catch {
    return origins;
  }

  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto"));
  const forwardedHost = firstHeaderValue(req.headers.get("x-forwarded-host"));
  const host = firstHeaderValue(req.headers.get("host"));
  const protocol = forwardedProto ?? requestUrl.protocol.replace(/:$/, "");

  addHostOrigin(origins, protocol, forwardedHost);
  addHostOrigin(origins, protocol, host);
  addOrigin(origins, process.env.NEXTAUTH_URL);
  addOrigin(origins, process.env.AUTH_URL);
  addOrigin(origins, process.env.APP_URL);
  addOrigin(origins, process.env.NEXT_PUBLIC_APP_URL);

  if (process.env.VERCEL_URL) {
    addOrigin(origins, `https://${process.env.VERCEL_URL}`);
  }

  return origins;
}

export function isSameOriginRequest(req: Request): boolean {
  if (!isMutatingMethod(req.method)) return true;

  const origin = req.headers.get("origin");
  if (!origin) return false;

  try {
    return getTrustedRequestOrigins(req).has(new URL(origin).origin);
  } catch {
    return false;
  }
}

/**
 * Defense-in-depth CSRF mitigation for state-changing API routes.
 *
 * Next.js route handlers don't get the implicit Origin check that Server
 * Actions do. For POST/PUT/PATCH/DELETE handlers we compare the request's
 * `Origin` header against trusted request origins; mismatch -> 403.
 *
 * Same-origin fetches from the app always include Origin. Cross-site form
 * posts either omit Origin entirely (older browsers) or send a different
 * one; both get rejected.
 *
 * Usage (at the top of a mutating handler):
 *   const bad = assertSameOrigin(req);
 *   if (bad) return bad;
 */
export function assertSameOrigin(req: Request): NextResponse | null {
  if (!isMutatingMethod(req.method)) return null;

  if (!req.headers.get("origin")) {
    return NextResponse.json({ error: "Origin header required" }, { status: 403 });
  }

  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
  }

  return null;
}
