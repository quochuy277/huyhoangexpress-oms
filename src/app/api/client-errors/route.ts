import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Receives client-side fatal errors (global-error.tsx) and logs them on the
// server. Open to unauthenticated callers because root-layout crashes can
// happen before/around session resolution. Body shape is intentionally narrow
// so we don't log arbitrary user-supplied blobs.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { name, message, stack, digest, url, scope } = body as {
      name?: unknown;
      message?: unknown;
      stack?: unknown;
      digest?: unknown;
      url?: unknown;
      scope?: unknown;
    };

    const safe = {
      name: typeof name === "string" ? name.slice(0, 200) : "Error",
      message: typeof message === "string" ? message.slice(0, 1000) : "(no message)",
      stack: typeof stack === "string" ? stack.slice(0, 4000) : undefined,
      digest: typeof digest === "string" ? digest.slice(0, 200) : undefined,
      url: typeof url === "string" ? url.slice(0, 500) : undefined,
      scope: typeof scope === "string" ? scope.slice(0, 60) : "global",
    };

    logger.error(`client-error:${safe.scope}`, safe.message, safe);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("POST /api/client-errors", "Failed to record client error", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
