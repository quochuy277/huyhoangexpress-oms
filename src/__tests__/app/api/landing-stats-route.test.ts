import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("returns fixed marketing stats without reading Supabase", async () => {
    const { GET } = await import("@/app/api/landing/stats/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      totalOrders: 200000,
      activeShops: 250,
      successRate: 98.6,
    });
    expect(prismaMock.systemSetting.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.order.count).not.toHaveBeenCalled();
    expect(prismaMock.order.groupBy).not.toHaveBeenCalled();
  });
});
