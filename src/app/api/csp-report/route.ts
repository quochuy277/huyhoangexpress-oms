import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// CSP violation report sink.
// Browsers POST here whenever the Content-Security-Policy-Report-Only header
// detects a resource that would have been blocked in enforcing mode.
//
// Two formats may arrive:
//   - Legacy `report-uri`: `Content-Type: application/csp-report`,
//     body shape `{ "csp-report": { ... } }`
//   - Modern `report-to` (Reporting API): `Content-Type: application/reports+json`,
//     body shape `[ { "type": "csp-violation", "body": { ... } } ]`
//
// We only use `report-uri` today (see next.config.ts), but we accept both so we
// don't have to change this endpoint when migrating later.
//
// This endpoint must stay unauthenticated — browsers cannot attach cookies when
// sending reports, and unauth reports are by design per the spec.

type LegacyCspReport = {
  "csp-report"?: {
    "document-uri"?: string;
    "blocked-uri"?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    "original-policy"?: string;
    "disposition"?: string;
    "status-code"?: number;
    "source-file"?: string;
    "line-number"?: number;
    "column-number"?: number;
  };
};

type ReportingApiReport = {
  type: string;
  age?: number;
  url?: string;
  user_agent?: string;
  body?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  try {
    // Some browsers send empty/malformed bodies. Never let that 500 — logging
    // is best-effort and must never break the user's page.
    const text = await req.text();
    if (!text) {
      return new NextResponse(null, { status: 204 });
    }

    let parsed: LegacyCspReport | ReportingApiReport[] | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      logger.warn("csp-report", "Invalid JSON in CSP report", { rawLength: text.length });
      return new NextResponse(null, { status: 204 });
    }

    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        if (entry?.type === "csp-violation") {
          logger.warn("csp-report", "CSP violation (report-to)", {
            url: entry.url,
            body: entry.body,
          });
        }
      }
    } else if (parsed && "csp-report" in parsed && parsed["csp-report"]) {
      const report = parsed["csp-report"];
      logger.warn("csp-report", "CSP violation (report-uri)", {
        documentUri: report["document-uri"],
        blockedUri: report["blocked-uri"],
        violatedDirective: report["violated-directive"],
        effectiveDirective: report["effective-directive"],
        sourceFile: report["source-file"],
        lineNumber: report["line-number"],
        columnNumber: report["column-number"],
      });
    }
  } catch (error) {
    logger.warn("csp-report", "Failed to process CSP report", { error });
  }

  return new NextResponse(null, { status: 204 });
}
