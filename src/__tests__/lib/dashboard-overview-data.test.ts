import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { normalizeDashboardSummaryData } from "@/lib/dashboard-overview-data";

describe("normalizeDashboardSummaryData", () => {
  it("converts Decimal values into client-safe numbers", () => {
    const normalized = normalizeDashboardSummaryData({
      todayOrderCount: 5,
      revenue: {
        current: new Prisma.Decimal("1250000"),
        previousMonth: new Prisma.Decimal("980000"),
      },
      cost: {
        current: 200000,
        claimDiff: new Prisma.Decimal("-70000"),
        totalOperatingExpenses: new Prisma.Decimal("130000"),
      },
      monthOrderCount: {
        current: 100,
        previousMonth: 90,
      },
      negativeRevenueCount: 2,
      deliveryRates: {
        successRate: 92.5,
        returnRate: 4.2,
        delayRate: 3.3,
      },
    });

    expect(normalized).toEqual({
      todayOrderCount: 5,
      revenue: {
        current: 1250000,
        previousMonth: 980000,
      },
      cost: {
        current: 200000,
        claimDiff: -70000,
        totalOperatingExpenses: 130000,
      },
      monthOrderCount: {
        current: 100,
        previousMonth: 90,
      },
      negativeRevenueCount: 2,
      deliveryRates: {
        successRate: 92.5,
        returnRate: 4.2,
        delayRate: 3.3,
      },
    });
  });
});
