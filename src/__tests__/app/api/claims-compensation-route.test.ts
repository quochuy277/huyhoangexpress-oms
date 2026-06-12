import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claimOrder: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSession(overrides: Record<string, boolean> = {}) {
  return {
    user: {
      id: "user-1",
      name: "Tester",
      role: "STAFF",
      permissions: {
        canViewClaims: false,
        canViewCompensation: true,
        canViewFinancePage: false,
        ...overrides,
      },
    },
  };
}

describe("claims compensation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValue([] as never);
  });

  it("rejects when user lacks compensation and finance permissions", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({ canViewCompensation: false }) as never);
    const { GET } = await import("@/app/api/claims/compensation/route");

    const response = await GET(
      new NextRequest("http://localhost/api/claims/compensation", { method: "GET" }),
    );

    expect(response.status).toBe(403);
    expect(prisma.claimOrder.findMany).not.toHaveBeenCalled();
  });

  it("filters by explicit date range and shop", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    const { GET } = await import("@/app/api/claims/compensation/route");

    await GET(new NextRequest(
      "http://localhost/api/claims/compensation?dateFrom=2026-02-01&dateTo=2026-02-28&shopName=Shop%20A",
      { method: "GET" },
    ));

    expect(prisma.claimOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        detectedDate: {
          gte: new Date(2026, 1, 1),
          lte: new Date(2026, 1, 28, 23, 59, 59, 999),
        },
        order: { shopName: "Shop A" },
      }),
    }));
  });

  it("returns summary, shops, monthly data, and issue distribution", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValue([
      {
        claimStatus: "CUSTOMER_COMPENSATED",
        carrierCompensation: 0,
        customerCompensation: 50000,
        detectedDate: new Date(2026, 1, 10),
        issueType: "LOST",
        order: { shopName: "Shop A" },
      },
      {
        claimStatus: "CARRIER_COMPENSATED",
        carrierCompensation: 100000,
        customerCompensation: 0,
        detectedDate: new Date(2026, 1, 12),
        issueType: "LOST",
        order: { shopName: "Shop A" },
      },
    ] as never);

    const { GET } = await import("@/app/api/claims/compensation/route");
    const response = await GET(new NextRequest(
      "http://localhost/api/claims/compensation?dateFrom=2026-02-01&dateTo=2026-02-28",
      { method: "GET" },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({
      totalClaims: 2,
      processingCount: 1,
      customerCompensatedCount: 1,
      customerRejectedCount: 0,
      pendingCount: 1,
      carrierTotal: 100000,
      customerTotal: 50000,
      difference: 50000,
    });
    expect(body.shops).toEqual([
      expect.objectContaining({
        shopName: "Shop A",
        totalClaims: 2,
        processing: 1,
        compensated: 1,
        rejected: 0,
        pending: 1,
        totalPaid: 50000,
      }),
    ]);
    expect(body.monthlyData).toEqual([
      { month: "02/2026", carrier: 100000, customer: 50000 },
    ]);
    expect(body.issueDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "LOST", count: 2 }),
      ]),
    );
  });
});
