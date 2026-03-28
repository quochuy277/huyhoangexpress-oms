import { describe, expect, it } from "vitest";

import {
  AUTO_SCAN_EXCLUDED_ISSUE_TYPES,
  CLAIM_STATUS_OPTIONS,
  COMPLETION_STATUSES,
  DEFAULT_ISSUE_TYPE,
  ISSUE_TYPE_CONFIG,
  ISSUE_TYPE_OPTIONS,
  formatClaimMoney,
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

  it("exports shared status options and completion statuses for claims views", () => {
    expect(CLAIM_STATUS_OPTIONS.some((option) => option.value === "PENDING")).toBe(true);
    expect(COMPLETION_STATUSES).toEqual([
      "RESOLVED",
      "CUSTOMER_COMPENSATED",
      "CUSTOMER_REJECTED",
    ]);
  });

  it("formats claim money in vi-VN currency style", () => {
    expect(formatClaimMoney(1250000)).toBe("1.250.000đ");
  });
});
