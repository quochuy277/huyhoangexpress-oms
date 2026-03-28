import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claimOrder: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSession(canViewCompensation = true) {
  return {
    user: {
      id: "user-1",
      name: "Tester",
      role: "STAFF",
      permissions: {
        canViewClaims: true,
        canCreateClaim: false,
        canUpdateClaim: false,
        canDeleteClaim: false,
        canViewCompensation,
        canViewFinancePage: false,
      },
    },
  };
}

describe("claims compensation route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-28T10:00:00.000Z"));
    vi.clearAllMocks();
    vi.mocked(prisma.claimOrder.aggregate).mockReset();
    vi.mocked(prisma.claimOrder.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.claimOrder.groupBy).mockResolvedValue([] as never);
    vi.mocked(prisma.$queryRaw as any).mockResolvedValue([] as never);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects GET /api/claims/compensation when canViewCompensation is false", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession(false) as never);
    const { GET } = await import("@/app/api/claims/compensation/route");

    const response = await GET(
      new NextRequest("http://localhost/api/claims/compensation?period=month", { method: "GET" }),
    );

    expect(response.status).toBe(403);
    expect(prisma.claimOrder.aggregate).not.toHaveBeenCalled();
  });

  it("returns summary, shop breakdown, monthly data, and issue distribution", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession(true) as never);
    vi.mocked(prisma.claimOrder.aggregate)
      .mockResolvedValueOnce({
        _sum: { carrierCompensation: 150000 },
        _count: 2,
      } as never)
      .mockResolvedValueOnce({
        _sum: { customerCompensation: 50000 },
        _count: 1,
      } as never);
    vi.mocked(prisma.claimOrder.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValue([
      {
        claimStatus: "CUSTOMER_COMPENSATED",
        isCompleted: true,
        carrierCompensation: 150000,
        customerCompensation: 50000,
        order: { shopName: "Shop A" },
      },
      {
        claimStatus: "CARRIER_COMPENSATED",
        isCompleted: false,
        carrierCompensation: 100000,
        customerCompensation: 0,
        order: { shopName: "Shop A" },
      },
    ] as never);
    vi.mocked(prisma.claimOrder.groupBy).mockResolvedValue([
      { issueType: "LOST", _count: 2 },
    ] as never);
    vi.mocked(prisma.$queryRaw as any).mockResolvedValue([
      { month: "03/2026", carrier_total: 150000, customer_total: 50000 },
    ] as never);

    const { GET } = await import("@/app/api/claims/compensation/route");
    const response = await GET(
      new NextRequest("http://localhost/api/claims/compensation?period=month", { method: "GET" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({
      carrierTotal: 150000,
      carrierCount: 2,
      customerTotal: 50000,
      customerCount: 1,
      difference: 100000,
      pendingCount: 1,
    });
    expect(body.shops).toEqual([
      expect.objectContaining({
        shopName: "Shop A",
        totalClaims: 2,
        processing: 1,
        compensated: 1,
        totalPaid: 50000,
        totalPending: 100000,
      }),
    ]);
    expect(body.monthlyData).toHaveLength(6);
    expect(body.monthlyData.at(-1)).toMatchObject({
      month: "03/2026",
      carrier: 150000,
      customer: 50000,
    });
    expect(body.issueDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "LOST",
          count: 2,
        }),
      ]),
    );
  });
});
