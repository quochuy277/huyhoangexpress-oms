import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildCrmTabHref, getCrmTab } from "@/components/crm/crm-tabs";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("crm tabs", () => {
  it("falls back to shops when the search param is invalid", () => {
    expect(getCrmTab("invalid-tab")).toBe("shops");
    expect(getCrmTab(null)).toBe("shops");
  });

  it("preserves existing search params when building the next tab href", () => {
    expect(buildCrmTabHref("/crm", "page=2&search=abc", "prospects")).toBe("/crm?page=2&search=abc&tab=prospects");
  });

  it("updates the CRM tab with history state instead of router navigation", () => {
    const source = readSource("src/components/crm/CrmClient.tsx");

    expect(source).toContain("window.history.replaceState");
    expect(source).not.toContain("router.replace(");
  });
});
