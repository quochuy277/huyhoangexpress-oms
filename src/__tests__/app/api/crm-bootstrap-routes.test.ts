import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      groupBy: vi.fn(),
    },
    shopAssignment: {
      findMany: vi.fn(),
    },
    shopProfile: {
      findMany: vi.fn(),
    },
    shopCareLog: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/route-permissions", () => ({
  hasPermission: (user: { permissions?: Record<string, boolean> | null } | null | undefined, permission: string) =>
    Boolean(user?.permissions?.[permission]),
}));

vi.mock("@/lib/crm-page-data", () => ({
  getCrmShopsInitialData: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { getCrmShopsInitialData } from "@/lib/crm-page-data";
import { prisma } from "@/lib/prisma";

function makeSession() {
  return {
    user: {
      id: "user-1",
      role: "ADMIN",
      permissions: {
        canViewCRM: true,
        canViewAllShops: true,
      },
    },
  };
}

describe("CRM bootstrap routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(getCrmShopsInitialData).mockResolvedValue({
      _timing: "cache_hit;dur=0.1,total;dur=0.1",
      dashboard: {
        success: true,
        data: {
          stats: { activeShops: 1, vipShops: 0, newShops: 0, warningShops: 0, inactiveShops: 0 },
          urgentList: [],
          recentActivities: [],
        },
      },
      shops: {
        success: true,
        data: {
          shops: [
            {
              shopName: "Shop A",
              totalOrders: 10,
              ordersThisMonth: 3,
              revenueThisMonth: 1000000,
              returnRate: 0,
              classification: "NORMAL",
              trend: "stable",
              assignees: [],
              lastContactDate: null,
            },
          ],
          pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
        },
      },
    } as never);
  });

  it("uses shared CRM bootstrap data for the default shops route", async () => {
    const { GET } = await import("@/app/api/crm/shops/route");

    const response = await GET(new NextRequest("http://localhost/api/crm/shops?page=1&pageSize=20"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(vi.mocked(getCrmShopsInitialData)).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      success: true,
      data: {
        shops: [
          expect.objectContaining({
            shopName: "Shop A",
          }),
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    });
    expect(prisma.order.groupBy).not.toHaveBeenCalled();
    expect(prisma.shopProfile.findMany).not.toHaveBeenCalled();
  });

  it("uses shared CRM bootstrap data for the dashboard route", async () => {
    const { GET } = await import("@/app/api/crm/dashboard/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(vi.mocked(getCrmShopsInitialData)).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      success: true,
      data: {
        stats: { activeShops: 1, vipShops: 0, newShops: 0, warningShops: 0, inactiveShops: 0 },
        urgentList: [],
        recentActivities: [],
      },
    });
    expect(prisma.order.groupBy).not.toHaveBeenCalled();
    expect(prisma.shopCareLog.findMany).not.toHaveBeenCalled();
  });
});
