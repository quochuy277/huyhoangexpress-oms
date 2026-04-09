import { describe, expect, it } from "vitest";

import { PHASE2_VIETNAMESE_AUDIT_TARGETS } from "@/lib/vietnamese-encoding-phase2";

describe.skip("Phase 2 Vietnamese encoding audit", () => {
  it("tracks the next module groups that still need a full UTF-8 cleanup wave", () => {
    expect(PHASE2_VIETNAMESE_AUDIT_TARGETS.map((target) => target.module)).toEqual([
      "orders",
      "claims",
      "finance",
      "admin",
      "status-mapper",
    ]);
  });
});
