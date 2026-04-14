import { describe, it, expect } from "vitest";

import {
  buildDelayedOrdersWhere,
  getDelayedExportOrderBy,
  escapeCsvCell,
  DELAYED_SCAN_LIMIT,
} from "@/lib/delayed-query";

// ============================================================
// buildDelayedOrdersWhere
// ============================================================
describe("buildDelayedOrdersWhere", () => {
  it("returns base conditions with no filters", () => {
    const where = buildDelayedOrdersWhere({
      search: "",
      shopFilter: "",
      carrierFilter: "",
      statusFilter: "",
    });

    expect(where.claimLocked).toBe(false);
    expect(where.OR).toBeDefined();
    expect(where.AND).toBeUndefined();
  });

  it("adds search conditions across multiple fields", () => {
    const where = buildDelayedOrdersWhere({
      search: "REQ-001",
      shopFilter: "",
      carrierFilter: "",
      statusFilter: "",
    });

    expect(where.AND).toBeDefined();
    const andConditions = where.AND as Array<{ OR?: unknown[] }>;
    expect(andConditions).toHaveLength(1);

    const orFields = andConditions[0].OR as Array<Record<string, unknown>>;
    expect(orFields.length).toBeGreaterThanOrEqual(5);

    const fieldNames = orFields.map((f) => Object.keys(f)[0]);
    expect(fieldNames).toContain("requestCode");
    expect(fieldNames).toContain("shopName");
    expect(fieldNames).toContain("receiverName");
    expect(fieldNames).toContain("receiverPhone");
    expect(fieldNames).toContain("carrierOrderCode");
  });

  it("adds shopFilter as exact match", () => {
    const where = buildDelayedOrdersWhere({
      search: "",
      shopFilter: "Shop A",
      carrierFilter: "",
      statusFilter: "",
    });

    const andConditions = where.AND as Array<Record<string, unknown>>;
    expect(andConditions).toContainEqual({ shopName: "Shop A" });
  });

  it("adds carrierFilter as exact match", () => {
    const where = buildDelayedOrdersWhere({
      search: "",
      shopFilter: "",
      carrierFilter: "GHN",
      statusFilter: "",
    });

    const andConditions = where.AND as Array<Record<string, unknown>>;
    expect(andConditions).toContainEqual({ carrierName: "GHN" });
  });

  it("adds statusFilter as exact match", () => {
    const where = buildDelayedOrdersWhere({
      search: "",
      shopFilter: "",
      carrierFilter: "",
      statusFilter: "Hoan giao hang",
    });

    const andConditions = where.AND as Array<Record<string, unknown>>;
    expect(andConditions).toContainEqual({ status: "Hoan giao hang" });
  });

  it("combines multiple filters into AND conditions", () => {
    const where = buildDelayedOrdersWhere({
      search: "test",
      shopFilter: "Shop B",
      carrierFilter: "GHTK",
      statusFilter: "Dang giao",
    });

    const andConditions = where.AND as Array<Record<string, unknown>>;
    expect(andConditions).toHaveLength(4);
  });

  it("always includes DELIVERY_DELAYED and RETURN_CONFIRMED in base OR", () => {
    const where = buildDelayedOrdersWhere({
      search: "",
      shopFilter: "",
      carrierFilter: "",
      statusFilter: "",
    });

    const orConditions = where.OR as Array<Record<string, unknown>>;
    const deliveryStatusCondition = orConditions[0] as {
      deliveryStatus: { in: string[] };
    };
    expect(deliveryStatusCondition.deliveryStatus.in).toContain("DELIVERY_DELAYED");
    expect(deliveryStatusCondition.deliveryStatus.in).toContain("RETURN_CONFIRMED");
  });

  it("includes DELIVERING with publicNotes patterns in base OR", () => {
    const where = buildDelayedOrdersWhere({
      search: "",
      shopFilter: "",
      carrierFilter: "",
      statusFilter: "",
    });

    const orConditions = where.OR as Array<Record<string, unknown>>;
    expect(orConditions.length).toBeGreaterThanOrEqual(2);

    const deliveringCondition = orConditions[1] as {
      AND: Array<Record<string, unknown>>;
    };
    expect(deliveringCondition.AND[0]).toEqual({ deliveryStatus: "DELIVERING" });
  });
});

// ============================================================
// getDelayedExportOrderBy
// ============================================================
describe("getDelayedExportOrderBy", () => {
  it("returns requestCode sort", () => {
    expect(getDelayedExportOrderBy("requestCode", "asc")).toEqual({ requestCode: "asc" });
  });

  it("returns shopName sort", () => {
    expect(getDelayedExportOrderBy("shopName", "desc")).toEqual({ shopName: "desc" });
  });

  it("returns status sort", () => {
    expect(getDelayedExportOrderBy("status", "asc")).toEqual({ status: "asc" });
  });

  it("returns createdTime sort", () => {
    expect(getDelayedExportOrderBy("createdTime", "desc")).toEqual({ createdTime: "desc" });
  });

  it("returns codAmount sort", () => {
    expect(getDelayedExportOrderBy("codAmount", "asc")).toEqual({ codAmount: "asc" });
  });

  it("falls back to lastUpdated desc for unknown keys", () => {
    expect(getDelayedExportOrderBy("unknown", "asc")).toEqual({ lastUpdated: "desc" });
    expect(getDelayedExportOrderBy("delayCount", "asc")).toEqual({ lastUpdated: "desc" });
  });
});

// ============================================================
// escapeCsvCell
// ============================================================
describe("escapeCsvCell", () => {
  it("wraps value in double quotes", () => {
    expect(escapeCsvCell("hello")).toBe('"hello"');
  });

  it("escapes internal double quotes", () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("handles null/undefined as empty string", () => {
    expect(escapeCsvCell(null)).toBe('""');
    expect(escapeCsvCell(undefined)).toBe('""');
  });

  it("converts numbers to string", () => {
    expect(escapeCsvCell(42)).toBe('"42"');
  });
});

// ============================================================
// Constants
// ============================================================
describe("constants", () => {
  it("DELAYED_SCAN_LIMIT is 2000", () => {
    expect(DELAYED_SCAN_LIMIT).toBe(2000);
  });
});
