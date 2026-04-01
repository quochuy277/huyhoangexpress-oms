import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  systemSetting: {
    findUnique: vi.fn(),
  },
  order: {
    count: vi.fn(),
    groupBy: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("landing stats route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds the fixed landing offsets on top of realtime database stats", async () => {
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);
    prismaMock.order.count
      .mockResolvedValueOnce(738)
      .mockResolvedValueOnce(88)
      .mockResolvedValueOnce(100);
    prismaMock.order.groupBy.mockResolvedValue([{ shopName: "Shop A" }, { shopName: "Shop B" }]);

    const { GET } = await import("@/app/api/landing/stats/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      totalOrders: 200738,
      activeShops: 252,
      successRate: 88,
    });
  });
});
