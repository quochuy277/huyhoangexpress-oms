import { describe, it, expect } from "vitest";

import { buildReturnsTabWhere } from "@/lib/returns-queries";

// ============================================================
// buildReturnsTabWhere — returns query builder
// ============================================================
describe("buildReturnsTabWhere", () => {
  it("partial tab filters DELIVERED + partial type + no warehouse date", () => {
    const where = buildReturnsTabWhere("partial");

    expect(where.claimLocked).toBe(false);
    expect(where.deliveryStatus).toBe("DELIVERED");
    expect(where.partialOrderType).toBe("Đơn một phần");
    expect(where.warehouseArrivalDate).toBeNull();
  });

  it("full tab filters RETURNING_FULL", () => {
    const where = buildReturnsTabWhere("full");

    expect(where.claimLocked).toBe(false);
    expect(where.deliveryStatus).toBe("RETURNING_FULL");
    expect(where.partialOrderType).toBeUndefined();
  });

  it("warehouse tab filters partial with warehouse date OR RETURN_DELAYED", () => {
    const where = buildReturnsTabWhere("warehouse");

    expect(where.claimLocked).toBe(false);
    expect(where.OR).toBeDefined();

    const orConditions = where.OR as Array<Record<string, unknown>>;
    expect(orConditions).toHaveLength(2);

    // First: partial with warehouse arrival date
    expect(orConditions[0]).toMatchObject({
      deliveryStatus: "DELIVERED",
      partialOrderType: "Đơn một phần",
      warehouseArrivalDate: { not: null },
    });

    // Second: return delayed
    expect(orConditions[1]).toEqual({
      deliveryStatus: "RETURN_DELAYED",
    });
  });

  it("all tabs have claimLocked: false", () => {
    for (const tab of ["partial", "full", "warehouse"] as const) {
      const where = buildReturnsTabWhere(tab);
      expect(where.claimLocked, `${tab} should have claimLocked: false`).toBe(false);
    }
  });
});
