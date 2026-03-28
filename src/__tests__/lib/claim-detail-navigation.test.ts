import { describe, expect, test } from "vitest";

import { syncExternalClaimDetail } from "@/lib/claim-detail-navigation";

describe("syncExternalClaimDetail", () => {
  test("keeps current drawer state when there is no external claim signal", () => {
    expect(syncExternalClaimDetail("claim-1", null)).toEqual({
      nextDetailClaimId: "claim-1",
      shouldConsume: false,
    });
  });

  test("opens the requested claim and consumes the signal", () => {
    expect(syncExternalClaimDetail(null, "claim-2")).toEqual({
      nextDetailClaimId: "claim-2",
      shouldConsume: true,
    });
  });

  test("reuses the requested claim id and still consumes repeated open signals", () => {
    expect(syncExternalClaimDetail("claim-2", "claim-2")).toEqual({
      nextDetailClaimId: "claim-2",
      shouldConsume: true,
    });
  });
});
