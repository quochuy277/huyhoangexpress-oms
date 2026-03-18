import { describe, it, expect, vi, beforeEach } from "vitest";

// Inline mock — avoids ESM hoisting issues with vitest-mock-extended
vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
    },
  },
}));

import { detectSlowJourneyOrders } from "@/lib/claim-detector";
import { prisma } from "@/lib/prisma";

// ============================================================
// Helper
// ============================================================
function makeOrder(
  id: string,
  regionGroup: string,
  daysAgo: number
): { id: string; requestCode: string; pickupTime: Date; regionGroup: string } {
  const pickupTime = new Date(Date.now() - daysAgo * 86400000);
  return { id, requestCode: `RC-${id}`, pickupTime, regionGroup };
}

function mockOrders(
  orders: { id: string; requestCode: string; pickupTime: Date; regionGroup: string }[]
) {
  vi.mocked(prisma.order.findMany).mockResolvedValue(orders as never);
}

// ============================================================
// detectSlowJourneyOrders — region-based thresholds
// ============================================================
describe("detectSlowJourneyOrders", () => {
  beforeEach(() => {
    vi.mocked(prisma.order.findMany).mockReset();
  });

  // --- Nội Tỉnh (0.x, 1.x, 2.x) → threshold 4 ngày ---

  it("does NOT detect Nội Tỉnh order with 3 days (under 4-day threshold)", async () => {
    mockOrders([makeOrder("order-1", "0.123", 3)]);
    const result = await detectSlowJourneyOrders();
    expect(result).not.toContain("order-1");
  });

  it("detects Nội Tỉnh (0.x) order with 5 days (over 4-day threshold)", async () => {
    mockOrders([makeOrder("order-2", "0.123", 5)]);
    const result = await detectSlowJourneyOrders();
    expect(result).toContain("order-2");
  });

  it("detects Nội Tỉnh (1.x) order with 5 days", async () => {
    mockOrders([makeOrder("order-3", "1.456", 5)]);
    const result = await detectSlowJourneyOrders();
    expect(result).toContain("order-3");
  });

  it("detects Nội Tỉnh (2.x) order with 5 days", async () => {
    mockOrders([makeOrder("order-4", "2.789", 5)]);
    const result = await detectSlowJourneyOrders();
    expect(result).toContain("order-4");
  });

  // --- Nội Miền (3.x, 4.x) → threshold 10 ngày ---

  it("does NOT detect Nội Miền order with 9 days (under 10-day threshold)", async () => {
    mockOrders([makeOrder("order-5", "3.789", 9)]);
    const result = await detectSlowJourneyOrders();
    expect(result).not.toContain("order-5");
  });

  it("detects Nội Miền (3.x) order with 11 days (over 10-day threshold)", async () => {
    mockOrders([makeOrder("order-6", "3.789", 11)]);
    const result = await detectSlowJourneyOrders();
    expect(result).toContain("order-6");
  });

  it("detects Nội Miền (4.x) order with 11 days", async () => {
    mockOrders([makeOrder("order-7", "4.123", 11)]);
    const result = await detectSlowJourneyOrders();
    expect(result).toContain("order-7");
  });

  // --- Liên Miền (5.x, 6.x) → threshold 15 ngày ---

  it("does NOT detect Liên Miền order with 14 days (under 15-day threshold)", async () => {
    mockOrders([makeOrder("order-8", "5.456", 14)]);
    const result = await detectSlowJourneyOrders();
    expect(result).not.toContain("order-8");
  });

  it("detects Liên Miền (5.x) order with 16 days (over 15-day threshold)", async () => {
    mockOrders([makeOrder("order-9", "5.456", 16)]);
    const result = await detectSlowJourneyOrders();
    expect(result).toContain("order-9");
  });

  it("detects Liên Miền (6.x) order with 16 days", async () => {
    mockOrders([makeOrder("order-10", "6.789", 16)]);
    const result = await detectSlowJourneyOrders();
    expect(result).toContain("order-10");
  });

  // --- Unknown region → fallback 15 ngày ---

  it("detects unknown region order with 16 days (fallback 15-day threshold)", async () => {
    mockOrders([makeOrder("order-11", "", 16)]);
    const result = await detectSlowJourneyOrders();
    expect(result).toContain("order-11");
  });

  it("does NOT detect unknown region order with 14 days", async () => {
    mockOrders([makeOrder("order-12", "", 14)]);
    const result = await detectSlowJourneyOrders();
    expect(result).not.toContain("order-12");
  });

  // --- Multiple orders ---

  it("returns only orders exceeding their threshold", async () => {
    mockOrders([
      makeOrder("slow-1", "0.1", 5),   // Nội Tỉnh, 5 > 4 → detect
      makeOrder("ok-1", "0.1", 2),     // Nội Tỉnh, 2 < 4 → skip
      makeOrder("slow-2", "3.1", 12),  // Nội Miền, 12 > 10 → detect
      makeOrder("ok-2", "3.1", 8),     // Nội Miền, 8 < 10 → skip
    ]);

    const result = await detectSlowJourneyOrders();
    expect(result).toContain("slow-1");
    expect(result).toContain("slow-2");
    expect(result).not.toContain("ok-1");
    expect(result).not.toContain("ok-2");
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no orders", async () => {
    mockOrders([]);
    const result = await detectSlowJourneyOrders();
    expect(result).toEqual([]);
  });
});
