import { describe, expect, it } from "vitest";
import { buildDelayedActiveChips } from "@/components/delayed/DelayedFilterPanel";

describe("DelayedFilterPanel", () => {
  it("does not create a mobile chip for risk selection", () => {
    expect(
      buildDelayedActiveChips({
        searchTerm: "",
        shopFilter: "Shop A",
        statusFilter: "",
        delayCountFilter: "4+",
        reasonFilter: "",
        riskFilter: "high",
        todayOnly: true,
      }),
    ).toEqual(["Shop A", "Hoãn 4+", "Đơn hoãn hôm nay"]);
  });
});
