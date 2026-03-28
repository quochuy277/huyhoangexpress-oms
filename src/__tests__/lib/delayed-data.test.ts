import { describe, expect, it } from "vitest";
import type { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import {
  applyDelayedFilters,
  buildDelayedExportRows,
  buildDelayedFacets,
  buildDelayedSummary,
  paginateDelayedOrders,
  sortDelayedOrders,
} from "@/lib/delayed-data";

function makeOrder(overrides: Partial<ProcessedDelayedOrder>): ProcessedDelayedOrder {
  return {
    id: "order-1",
    requestCode: "REQ-001",
    customerOrderCode: "CO-001",
    carrierOrderCode: "GHN-001",
    shopName: "Shop A",
    receiverName: "Nguyen Van A",
    receiverPhone: "0900000001",
    fullAddress: "1 Nguyen Trai - Quan 1 - HCM",
    status: "Hoan giao hang",
    deliveryStatus: "DELIVERY_DELAYED",
    codAmount: 100000,
    createdTime: new Date("2026-03-20T00:00:00.000Z"),
    carrierName: "GHN",
    delayCount: 1,
    delays: [{ time: "10:00", date: "20/03/2026", reason: "Khong lien lac duoc KH" }],
    uniqueReasons: ["Khong lien lac duoc KH"],
    daysAge: 3,
    risk: "low",
    riskScore: 1,
    staffNotes: "",
    claimOrder: null,
    ...overrides,
  };
}

describe("delayed-data", () => {
  const orders = [
    makeOrder({
      id: "order-1",
      requestCode: "REQ-001",
      shopName: "Shop A",
      codAmount: 100000,
      delayCount: 1,
      uniqueReasons: ["Khong lien lac duoc KH"],
      risk: "low",
      riskScore: 1,
    }),
    makeOrder({
      id: "order-2",
      requestCode: "REQ-002",
      shopName: "Shop B",
      codAmount: 200000,
      delayCount: 2,
      uniqueReasons: ["KH hen lai ngay giao"],
      risk: "medium",
      riskScore: 2,
    }),
    makeOrder({
      id: "order-3",
      requestCode: "REQ-003",
      shopName: "Shop A",
      codAmount: 300000,
      delayCount: 4,
      uniqueReasons: ["Xac nhan hoan hang"],
      risk: "high",
      riskScore: 3,
    }),
  ];

  it("builds summary across the whole filtered set", () => {
    expect(buildDelayedSummary(orders)).toEqual({
      total: 3,
      high: 1,
      medium: 1,
      low: 1,
      totalCOD: 600000,
      highCOD: 300000,
    });
  });

  it("builds facets and distributions from all filtered rows", () => {
    expect(buildDelayedFacets(orders)).toEqual({
      shops: ["Shop A", "Shop B"],
      statuses: ["Hoan giao hang"],
      reasons: ["KH hen lai ngay giao", "Khong lien lac duoc KH", "Xac nhan hoan hang"],
      delayDistribution: [
        { name: "1 lan", count: 1 },
        { name: "2 lan", count: 1 },
        { name: "3 lan", count: 0 },
        { name: "4+ lan", count: 1 },
      ],
      reasonDistribution: [
        { name: "KH hen lai ngay giao", count: 1 },
        { name: "Khong lien lac duoc KH", count: 1 },
        { name: "Xac nhan hoan hang", count: 1 },
      ],
    });
  });

  it("applies post-processed filters before pagination", () => {
    expect(
      applyDelayedFilters(orders, {
        search: "",
        shop: "Shop A",
        status: "",
        delay: "4+",
        reason: "Xac nhan hoan hang",
        risk: "high",
      }).map((order) => order.requestCode),
    ).toEqual(["REQ-003"]);
  });

  it("paginates rows without changing total counts", () => {
    expect(paginateDelayedOrders(orders, 2, 1)).toEqual({
      rows: [orders[1]],
      pagination: {
        page: 2,
        pageSize: 1,
        total: 3,
        totalPages: 3,
      },
    });
  });

  it("sorts the filtered set before pagination", () => {
    expect(
      sortDelayedOrders(orders, "codAmount", "desc").map((order) => order.requestCode),
    ).toEqual(["REQ-003", "REQ-002", "REQ-001"]);
  });

  it("builds export rows from the full filtered dataset", () => {
    expect(buildDelayedExportRows(orders)).toEqual([
      expect.objectContaining({
        "Ma Yeu Cau": "REQ-001",
        "So Lan Hoan": 1,
      }),
      expect.objectContaining({
        "Ma Yeu Cau": "REQ-002",
        "Muc Do Rui Ro": "TRUNG BINH",
      }),
      expect.objectContaining({
        "Ma Yeu Cau": "REQ-003",
        "Muc Do Rui Ro": "CAO",
      }),
    ]);
  });
});
