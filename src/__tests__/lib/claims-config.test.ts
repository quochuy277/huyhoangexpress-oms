import { describe, expect, it } from "vitest";

import {
  AUTO_SCAN_EXCLUDED_ISSUE_TYPES,
  DEFAULT_ISSUE_TYPE,
  ISSUE_TYPE_CONFIG,
  ISSUE_TYPE_OPTIONS,
  getIssueTypeLabel,
} from "@/lib/claims-config";

describe("claims-config", () => {
  it("adds the fee complaint issue type with KN Phi label", () => {
    expect(ISSUE_TYPE_CONFIG.FEE_COMPLAINT).toMatchObject({
      label: "KN Phí",
    });

    expect(
      ISSUE_TYPE_OPTIONS.some((option) => option.value === "FEE_COMPLAINT" && option.label === "KN Phí")
    ).toBe(true);
  });

  it("keeps slow journey as the default issue type fallback", () => {
    expect(DEFAULT_ISSUE_TYPE).toBe("SLOW_JOURNEY");
    expect(getIssueTypeLabel("UNKNOWN_TYPE")).toBe("Hành trình chậm");
  });

  it("includes fee complaint in the auto-scan exclusion group", () => {
    expect(AUTO_SCAN_EXCLUDED_ISSUE_TYPES).toEqual([
      "SUSPICIOUS",
      "DAMAGED",
      "LOST",
      "OTHER",
      "FEE_COMPLAINT",
    ]);
  });
});
