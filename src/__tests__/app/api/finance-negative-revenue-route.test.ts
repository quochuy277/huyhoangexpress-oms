import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSession() {
  return {
    user: {
      id: "user-1",
      name: "Finance Tester",
      role: "MANAGER",
      permissions: {
        canViewFinancePage: true,
      },
    },
  };
}

describe("finance negative revenue route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns shopName in negative revenue orders for analysis tab", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.order.aggregate).mockResolvedValue({
      _sum: { revenue: -120000 },
      _count: 1,
    } as never);
    vi.mocked(prisma.order.groupBy).mockResolvedValue([
      { carrierName: "GHN", _count: 1 },
    ] as never);
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      {
        requestCode: "REQ-001",
        carrierName: "GHN",
        shopName: "Shop ten hien thi",
        creatorShopName: "Shop tao don",
        status: "RETURNED",
        deliveryStatus: "RETURNED_FULL",
        totalFee: 35000,
        carrierFee: 12000,
        revenue: -120000,
        codAmount: 200000,
        regionGroup: "HN",
      },
    ] as never);

    const { GET } = await import("@/app/api/finance/negative-revenue/route");
    const response = await GET(
      new NextRequest("http://localhost/api/finance/negative-revenue?period=month"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toEqual([
      expect.objectContaining({
        requestCode: "REQ-001",
        shopName: "Shop ten hien thi",
        creatorShopName: "Shop tao don",
      }),
    ]);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          shopName: true,
          creatorShopName: true,
        }),
      }),
    );
  });
});
