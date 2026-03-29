import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    status: "Hoãn giao hàng",
    deliveryStatus: "DELIVERY_DELAYED",
    codAmount: 100000,
    createdTime: new Date("2026-03-20T00:00:00.000Z"),
    carrierName: "GHN",
    delayCount: 1,
    delays: [{ time: "10:00", date: "20/03/2026", reason: "Không liên lạc được KH" }],
    uniqueReasons: ["Không liên lạc được KH"],
    daysAge: 3,
    risk: "low",
    riskScore: 1,
    staffNotes: "",
    claimOrder: null,
    ...overrides,
  };
}

describe("delayed-data", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22T05:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const orders = [
    makeOrder({
      id: "order-1",
      requestCode: "REQ-001",
      shopName: "Shop A",
      codAmount: 100000,
      delayCount: 1,
      uniqueReasons: ["Không liên lạc được KH"],
      risk: "low",
      riskScore: 1,
    }),
    makeOrder({
      id: "order-2",
      requestCode: "REQ-002",
      shopName: "Shop B",
      codAmount: 200000,
      delayCount: 2,
      uniqueReasons: ["KH hẹn lại ngày giao"],
      risk: "medium",
      riskScore: 2,
    }),
    makeOrder({
      id: "order-3",
      requestCode: "REQ-003",
      shopName: "Shop A",
      codAmount: 300000,
      delayCount: 4,
      uniqueReasons: ["Xác nhận hoàn hàng"],
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
      statuses: ["Hoãn giao hàng"],
      reasons: ["KH hẹn lại ngày giao", "Không liên lạc được KH", "Xác nhận hoàn hàng"],
      delayDistribution: [
        { name: "1 lần", count: 1 },
        { name: "2 lần", count: 1 },
        { name: "3 lần", count: 0 },
        { name: "4+ lần", count: 1 },
      ],
      reasonDistribution: [
        { name: "KH hẹn lại ngày giao", count: 1 },
        { name: "Không liên lạc được KH", count: 1 },
        { name: "Xác nhận hoàn hàng", count: 1 },
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
        reason: "Xác nhận hoàn hàng",
        risk: "high",
        today: false,
      }).map((order) => order.requestCode),
    ).toEqual(["REQ-003"]);
  });

  it("filters orders that have at least one delay today", () => {
    const todayOrders = applyDelayedFilters(
      [
        makeOrder({
          id: "today-order",
          requestCode: "REQ-TODAY",
          delays: [{ time: "09:30", date: "22/03/2026", reason: "KhÃ´ng liÃªn láº¡c Ä‘Æ°á»£c KH" }],
          uniqueReasons: ["KhÃ´ng liÃªn láº¡c Ä‘Æ°á»£c KH"],
        }),
        makeOrder({
          id: "old-order",
          requestCode: "REQ-OLD",
          delays: [{ time: "14:00", date: "21/03/2026", reason: "KH háº¹n láº¡i ngÃ y giao" }],
          uniqueReasons: ["KH háº¹n láº¡i ngÃ y giao"],
        }),
      ],
      {
        search: "",
        shop: "",
        status: "",
        delay: "",
        reason: "",
        risk: "all",
        today: true,
      },
    );

    expect(todayOrders.map((order) => order.requestCode)).toEqual(["REQ-TODAY"]);
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
        "Mã Yêu Cầu": "REQ-001",
        "Số Lần Hoãn": 1,
      }),
      expect.objectContaining({
        "Mã Yêu Cầu": "REQ-002",
        "Mức Độ Rủi Ro": "TRUNG BÌNH",
      }),
      expect.objectContaining({
        "Mã Yêu Cầu": "REQ-003",
        "Mức Độ Rủi Ro": "CAO",
      }),
    ]);
  });
});
