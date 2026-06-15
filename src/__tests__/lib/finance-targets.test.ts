import { describe, expect, it } from "vitest";
import { mapTargetRows } from "@/lib/finance/targets";

describe("mapTargetRows", () => {
  it("ánh xạ metric về netRevenue/netProfit", () => {
    expect(mapTargetRows([
      { metric: "NET_REVENUE", targetAmount: 600 },
      { metric: "NET_PROFIT", targetAmount: 230 },
    ])).toEqual({ netRevenue: 600, netProfit: 230 });
  });
  it("thiếu metric → null", () => {
    expect(mapTargetRows([{ metric: "NET_PROFIT", targetAmount: 230 }])).toEqual({ netRevenue: null, netProfit: 230 });
  });
  it("rỗng → cả hai null", () => {
    expect(mapTargetRows([])).toEqual({ netRevenue: null, netProfit: null });
  });
});
