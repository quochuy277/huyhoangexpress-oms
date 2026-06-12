import { describe, expect, it } from "vitest";

import {
  buildMonthlyBuckets,
  resolveCompensationRange,
  summarizeCompensationClaims,
  type CompensationClaimRow,
} from "@/lib/claims-compensation";

const NOW = new Date(2026, 5, 12, 10, 0, 0); // 12/06/2026 10:00 local

function makeClaim(overrides: Partial<CompensationClaimRow> = {}): CompensationClaimRow {
  return {
    claimStatus: "PENDING",
    carrierCompensation: 0,
    customerCompensation: 0,
    detectedDate: new Date(2026, 2, 15),
    issueType: "LOST",
    shopName: "Shop A",
    ...overrides,
  };
}

describe("resolveCompensationRange", () => {
  it("defaults to year-to-date (1/1 -> end of today)", () => {
    const range = resolveCompensationRange({}, NOW);

    expect(range.from).toEqual(new Date(2026, 0, 1));
    expect(range.to).toEqual(new Date(2026, 5, 12, 23, 59, 59, 999));
  });

  it("parses explicit range and includes the whole dateTo day", () => {
    const range = resolveCompensationRange({ dateFrom: "2026-02-01", dateTo: "2026-02-28" }, NOW);

    expect(range.from).toEqual(new Date(2026, 1, 1));
    expect(range.to).toEqual(new Date(2026, 1, 28, 23, 59, 59, 999));
  });

  it("falls back to default when values are invalid or inverted", () => {
    const invalid = resolveCompensationRange({ dateFrom: "not-a-date", dateTo: "also-bad" }, NOW);
    expect(invalid.from).toEqual(new Date(2026, 0, 1));
    expect(invalid.to).toEqual(new Date(2026, 5, 12, 23, 59, 59, 999));

    const inverted = resolveCompensationRange({ dateFrom: "2026-05-10", dateTo: "2026-05-01" }, NOW);
    expect(inverted.from).toEqual(new Date(2026, 0, 1));
  });
});

describe("buildMonthlyBuckets", () => {
  it("spans months across a year boundary", () => {
    const buckets = buildMonthlyBuckets({
      from: new Date(2025, 10, 5),
      to: new Date(2026, 1, 20),
    });

    expect(buckets).toEqual(["11/2025", "12/2025", "01/2026", "02/2026"]);
  });
});

describe("summarizeCompensationClaims", () => {
  const range = { from: new Date(2026, 0, 1), to: new Date(2026, 2, 31, 23, 59, 59, 999) };

  it("partitions counts by claimStatus and sums both money directions", () => {
    const { summary } = summarizeCompensationClaims([
      makeClaim({ claimStatus: "PENDING" }),
      makeClaim({ claimStatus: "RESOLVED" }),
      makeClaim({ claimStatus: "CARRIER_COMPENSATED", carrierCompensation: 100000 }),
      makeClaim({ claimStatus: "CARRIER_REJECTED" }),
      makeClaim({ claimStatus: "CUSTOMER_COMPENSATED", customerCompensation: 60000 }),
      makeClaim({ claimStatus: "CUSTOMER_REJECTED" }),
    ], range);

    expect(summary).toEqual({
      totalClaims: 6,
      processingCount: 3,
      customerCompensatedCount: 1,
      customerRejectedCount: 1,
      pendingCount: 2,
      carrierTotal: 100000,
      customerTotal: 60000,
      difference: 40000,
    });
  });

  it("groups shop rows sorted by total claims desc", () => {
    const { shops } = summarizeCompensationClaims([
      makeClaim({ shopName: "Shop B" }),
      makeClaim({ shopName: "Shop A", claimStatus: "CUSTOMER_COMPENSATED", customerCompensation: 30000 }),
      makeClaim({ shopName: "Shop A", claimStatus: "CARRIER_COMPENSATED", carrierCompensation: 50000 }),
    ], range);

    expect(shops[0]).toEqual({
      shopName: "Shop A",
      totalClaims: 2,
      processing: 1,
      compensated: 1,
      rejected: 0,
      pending: 1,
      totalPaid: 30000,
    });
    expect(shops[1].shopName).toBe("Shop B");
  });

  it("zero-fills monthly buckets and issue types without claims", () => {
    const { monthlyData, issueDistribution } = summarizeCompensationClaims([
      makeClaim({
        claimStatus: "CUSTOMER_COMPENSATED",
        customerCompensation: 20000,
        detectedDate: new Date(2026, 1, 10),
      }),
    ], range);

    expect(monthlyData).toEqual([
      { month: "01/2026", carrier: 0, customer: 0 },
      { month: "02/2026", carrier: 0, customer: 20000 },
      { month: "03/2026", carrier: 0, customer: 0 },
    ]);

    expect(issueDistribution.find((entry) => entry.type === "LOST")?.count).toBe(1);
    expect(issueDistribution.find((entry) => entry.type === "DAMAGED")?.count).toBe(0);
  });

  it("returns zero-filled aggregates when given no claims", () => {
    const { summary, shops, monthlyData, issueDistribution } = summarizeCompensationClaims([], range);

    expect(summary).toEqual({
      totalClaims: 0,
      processingCount: 0,
      customerCompensatedCount: 0,
      customerRejectedCount: 0,
      pendingCount: 0,
      carrierTotal: 0,
      customerTotal: 0,
      difference: 0,
    });
    expect(shops).toEqual([]);
    expect(monthlyData.every((bucket) => bucket.carrier === 0 && bucket.customer === 0)).toBe(true);
    expect(issueDistribution.every((entry) => entry.count === 0)).toBe(true);
    expect(issueDistribution.length).toBeGreaterThan(0);
  });
});
