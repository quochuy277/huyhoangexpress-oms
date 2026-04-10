import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getClaimsExportTruncationMessage } from "@/hooks/useClaimMutations";
import {
  parseClaimsFilterOptionsResponse,
  parseClaimsListResponse,
} from "@/hooks/useClaimsList";

describe("claims hooks helpers", () => {
  it("does not register a visibility-based auto refetch for claims list", () => {
    const hookPath = path.resolve(process.cwd(), "src/hooks/useClaimsList.ts");
    const hookSource = fs.readFileSync(hookPath, "utf8");

    expect(hookSource).not.toContain("visibilitychange");
    expect(hookSource).not.toContain("document.visibilityState");
  });

  it("throws backend errors for failed claims list responses", async () => {
    const response = new Response(JSON.stringify({ error: "Không có quyền xem claims" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });

    await expect(parseClaimsListResponse(response)).rejects.toThrow("Không có quyền xem claims");
  });

  it("throws fallback errors for failed claims filter option responses", async () => {
    const response = new Response("server error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });

    await expect(parseClaimsFilterOptionsResponse(response)).rejects.toThrow("Không thể tải bộ lọc đơn có vấn đề");
  });

  it("returns a warning message when the export was truncated", () => {
    const response = new Response("", {
      status: 200,
      headers: {
        "X-Claims-Export-Truncated": "true",
        "X-Claims-Export-Limit": "3000",
      },
    });

    expect(getClaimsExportTruncationMessage(response)).toContain("3000");
  });

  it("returns no warning when the export includes the full result set", () => {
    const response = new Response("", { status: 200 });

    expect(getClaimsExportTruncationMessage(response)).toBeNull();
  });
});
