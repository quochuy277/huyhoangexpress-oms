import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("claims API source instrumentation", () => {
  it.each([
    "src/app/api/claims/route.ts",
    "src/app/api/claims/filter-options/route.ts",
  ])("uses the shared Server-Timing helper in %s", (relativePath) => {
    const source = readSource(relativePath);

    expect(source).toContain('from "@/lib/server-timing"');
    expect(source).toContain("createServerTiming(");
    expect(source).not.toContain("function createServerTimingHeader");
  });
});
