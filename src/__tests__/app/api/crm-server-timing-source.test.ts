import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("CRM API source instrumentation", () => {
  it("gắn Server-Timing cho route shops", () => {
    const source = readSource("src/app/api/crm/shops/route.ts");

    expect(source).toContain("createServerTiming");
    expect(source).toContain("timing.headers()");
    expect(source).toContain("timing.log(\"crm-shops-api\")");
  });

  it("gắn Server-Timing cho route dashboard", () => {
    const source = readSource("src/app/api/crm/dashboard/route.ts");

    expect(source).toContain("createServerTiming");
    expect(source).toContain("timing.headers()");
    expect(source).toContain("timing.log(\"crm-dashboard-api\")");
  });

  it("gắn Server-Timing cho route prospects", () => {
    const source = readSource("src/app/api/crm/prospects/route.ts");

    expect(source).toContain("createServerTiming");
    expect(source).toContain("timing.headers()");
    expect(source).toContain("timing.log(\"crm-prospects-api\")");
  });
});
