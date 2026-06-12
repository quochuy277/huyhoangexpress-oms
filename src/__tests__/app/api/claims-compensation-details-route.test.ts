import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claimOrder: {
      count: vi.fn(),
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

describe("claims compensation details route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.claimOrder.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValue([] as never);
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const { GET } = await import("@/app/api/claims/compensation/details/route");

    const response = await GET(new NextRequest(
      "http://localhost/api/claims/compensation/details?shopName=Shop%20A",
      { method: "GET" },
    ));

    expect(response.status).toBe(401);
  });

  it("rejects users without compensation access", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession({ canViewCompensation: false }) as never);
    const { GET } = await import("@/app/api/claims/compensation/details/route");

    const response = await GET(new NextRequest(
      "http://localhost/api/claims/compensation/details?shopName=Shop%20A",
      { method: "GET" },
    ));

    expect(response.status).toBe(403);
    expect(prisma.claimOrder.findMany).not.toHaveBeenCalled();
  });

  it("requires shopName", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    const { GET } = await import("@/app/api/claims/compensation/details/route");

    const response = await GET(new NextRequest(
      "http://localhost/api/claims/compensation/details",
      { method: "GET" },
    ));

    expect(response.status).toBe(400);
  });

  it("paginates and maps claim rows", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.claimOrder.count).mockResolvedValue(45 as never);
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValue([
      {
        id: "claim-1",
        claimStatus: "CUSTOMER_COMPENSATED",
        issueType: "LOST",
        detectedDate: new Date(2026, 1, 10),
        carrierCompensation: 100000,
        customerCompensation: 50000,
        order: { requestCode: "YC123" },
      },
    ] as never);

    const { GET } = await import("@/app/api/claims/compensation/details/route");
    const response = await GET(new NextRequest(
      "http://localhost/api/claims/compensation/details?shopName=Shop%20A&dateFrom=2026-01-01&dateTo=2026-03-31&page=2",
      { method: "GET" },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.claimOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        order: { shopName: "Shop A" },
      }),
      orderBy: { detectedDate: "desc" },
      skip: 20,
      take: 20,
    }));
    expect(body.claims).toEqual([
      expect.objectContaining({
        id: "claim-1",
        requestCode: "YC123",
        claimStatus: "CUSTOMER_COMPENSATED",
        issueType: "LOST",
        carrierCompensation: 100000,
        customerCompensation: 50000,
      }),
    ]);
    expect(body.pagination).toEqual({ page: 2, pageSize: 20, total: 45 });
  });

  it("allows finance users with canViewFinancePage even without canViewCompensation", async () => {
    vi.mocked(auth).mockResolvedValue(
      makeSession({ canViewCompensation: false, canViewFinancePage: true }) as never,
    );
    vi.mocked(prisma.claimOrder.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.claimOrder.findMany).mockResolvedValue([] as never);

    const { GET } = await import("@/app/api/claims/compensation/details/route");
    const response = await GET(new NextRequest(
      "http://localhost/api/claims/compensation/details?shopName=Shop%20A",
      { method: "GET" },
    ));

    expect(response.status).toBe(200);
  });
});
