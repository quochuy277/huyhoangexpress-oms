import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/claims/search-orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "user-1",
        role: "STAFF",
        permissions: { canViewClaims: true },
      },
    } as never);
    vi.mocked(prisma.order.findMany).mockResolvedValue([] as never);
  });

  it("returns an empty result for queries shorter than 2 characters", async () => {
    const { GET } = await import("@/app/api/claims/search-orders/route");
    const response = await GET(new NextRequest("http://localhost/api/claims/search-orders?q=9"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ orders: [] });
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });

  it("uses exact request code search and keeps existingClaim mapping", async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      {
        id: "order-1",
        requestCode: "B65ACHM0007569",
        carrierOrderCode: "GYKBGEVY",
        carrierName: "GHN",
        shopName: "Shop A",
        status: "Đã giao hàng",
        deliveryStatus: "DELIVERED",
        codAmount: 100000,
        totalFee: 25000,
        receiverPhone: "0904873551",
        staffNotes: "",
        claimOrder: {
          id: "claim-1",
          claimStatus: "PENDING",
          isCompleted: false,
        },
      },
    ] as never);

    const { GET } = await import("@/app/api/claims/search-orders/route");
    const response = await GET(
      new NextRequest("http://localhost/api/claims/search-orders?q=b65achm0007569"),
    );
    const body = await response.json();

    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ requestCode: "B65ACHM0007569" }],
        },
      }),
    );
    expect(body.orders).toEqual([
      expect.objectContaining({
        requestCode: "B65ACHM0007569",
        existingClaim: {
          id: "claim-1",
          claimStatus: "PENDING",
          isCompleted: false,
        },
      }),
    ]);
  });

  it("uses exact phone search without applying the recent window", async () => {
    const { GET } = await import("@/app/api/claims/search-orders/route");
    await GET(new NextRequest("http://localhost/api/claims/search-orders?q=0904873551"));

    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ receiverPhone: "0904873551" }],
        },
      }),
    );
  });

  it("uses last4 phone search with the shared recent window", async () => {
    const { GET } = await import("@/app/api/claims/search-orders/route");
    await GET(new NextRequest("http://localhost/api/claims/search-orders?q=3551"));

    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { receiverPhone: { endsWith: "3551" } },
            expect.objectContaining({
              createdTime: expect.objectContaining({ gte: expect.any(Date) }),
            }),
          ]),
        }),
      }),
    );
  });

  it("uses shared text search fields with the recent window", async () => {
    const { GET } = await import("@/app/api/claims/search-orders/route");
    await GET(new NextRequest("http://localhost/api/claims/search-orders?q=431%20Oni"));

    expect(vi.mocked(prisma.order.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: [
                { receiverName: { contains: "431 Oni", mode: "insensitive" } },
                { shopName: { contains: "431 Oni", mode: "insensitive" } },
                { carrierOrderCode: { contains: "431 Oni", mode: "insensitive" } },
              ],
            },
            expect.objectContaining({
              createdTime: expect.objectContaining({ gte: expect.any(Date) }),
            }),
          ]),
        }),
        take: 10,
        orderBy: { createdTime: "desc" },
      }),
    );
  });
});
