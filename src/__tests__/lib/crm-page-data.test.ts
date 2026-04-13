import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/server-timing", () => ({
  createServerTiming: () => ({
    measure: async (_label: string, fn: () => Promise<unknown>) => fn(),
    record: vi.fn(),
    log: vi.fn(),
    headerValue: () => "",
    headers: () => ({}),
  }),
}));

const ADMIN_USER = {
  id: "admin-1",
  role: "ADMIN",
  permissions: {
    canViewCRM: true,
    canViewAllShops: true,
  },
};

function makeShopAggregate(index: number) {
  return {
    shopName: `Shop ${String(index).padStart(2, "0")}`,
    _count: { id: 200 - index },
    _max: { createdTime: new Date("2026-04-12T00:00:00.000Z") },
    _min: { createdTime: new Date("2025-12-01T00:00:00.000Z") },
  };
}

function makeCountAggregate(index: number, count: number) {
  return {
    shopName: `Shop ${String(index).padStart(2, "0")}`,
    _count: { id: count },
  };
}

function makeMonthlyAggregate(index: number, count: number) {
  return {
    shopName: `Shop ${String(index).padStart(2, "0")}`,
    _count: { id: count },
    _sum: { revenue: count * 100000 },
  };
}

type PrismaMock = {
  order: {
    groupBy: ReturnType<typeof vi.fn>;
  };
  shopAssignment: {
    findMany: ReturnType<typeof vi.fn>;
  };
  shopProfile: {
    findMany: ReturnType<typeof vi.fn>;
  };
  shopCareLog: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

function seedGroupByForBootstrap(prisma: PrismaMock, shopCount = 0) {
  const allShops = Array.from({ length: shopCount }, (_, index) => makeShopAggregate(index + 1));
  const recent = Array.from({ length: shopCount }, (_, index) => makeCountAggregate(index + 1, Math.max(1, shopCount - index)));
  const prev = Array.from({ length: shopCount }, (_, index) => makeCountAggregate(index + 1, Math.max(1, shopCount - index - 1)));
  const monthly = Array.from({ length: shopCount }, (_, index) => makeMonthlyAggregate(index + 1, Math.max(1, shopCount - index)));
  const returned = Array.from({ length: shopCount }, (_, index) => makeCountAggregate(index + 1, index % 3));
  const recentOrders = Array.from({ length: shopCount }, (_, index) => makeCountAggregate(index + 1, Math.max(1, shopCount - index)));
  const prevOrders = Array.from({ length: shopCount }, (_, index) => makeCountAggregate(index + 1, Math.max(1, shopCount - index - 2)));

  prisma.order.groupBy
    .mockResolvedValue([] as never)
    .mockResolvedValueOnce(allShops as never)
    .mockResolvedValueOnce(recent as never)
    .mockResolvedValueOnce(prev as never)
    .mockResolvedValueOnce(monthly as never)
    .mockResolvedValueOnce(returned as never)
    .mockResolvedValueOnce(recentOrders as never)
    .mockResolvedValueOnce(prevOrders as never);
}

describe("crm page data", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-12T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reuses cached shops bootstrap data within TTL and reloads after TTL expires", async () => {
    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as PrismaMock;
    prismaMock.order.groupBy.mockReset();
    prismaMock.shopAssignment.findMany.mockResolvedValue([] as never);
    prismaMock.shopProfile.findMany.mockResolvedValue([] as never);
    prismaMock.shopCareLog.findMany.mockResolvedValue([] as never);
    seedGroupByForBootstrap(prismaMock, 0);
    const { getCrmShopsInitialData } = await import("@/lib/crm-page-data");

    await getCrmShopsInitialData(ADMIN_USER);
    await getCrmShopsInitialData(ADMIN_USER);

    expect(prismaMock.order.groupBy).toHaveBeenCalledTimes(7);

    seedGroupByForBootstrap(prismaMock, 0);
    vi.advanceTimersByTime(31_000);

    await getCrmShopsInitialData(ADMIN_USER);

    expect(prismaMock.order.groupBy).toHaveBeenCalledTimes(14);
  });

  it("loads assignments only for the 20 shops rendered in the initial bootstrap", async () => {
    const { prisma } = await import("@/lib/prisma");
    const prismaMock = prisma as unknown as PrismaMock;
    prismaMock.order.groupBy.mockReset();
    prismaMock.shopAssignment.findMany.mockResolvedValue([] as never);
    prismaMock.shopCareLog.findMany.mockResolvedValue([] as never);
    seedGroupByForBootstrap(prismaMock, 25);
    const allProfiles = Array.from({ length: 25 }, (_, index) => ({
      shopName: `Shop ${String(index + 1).padStart(2, "0")}`,
      classification: null,
      careLogs: [],
    }));
    const top20ProfilesWithAssignments = Array.from({ length: 20 }, (_, index) => ({
      shopName: `Shop ${String(index + 1).padStart(2, "0")}`,
      assignments: [
        {
          user: {
            id: `user-${index + 1}`,
            name: `Nhân viên ${index + 1}`,
          },
        },
      ],
    }));

    vi.mocked(prismaMock.shopProfile.findMany)
      .mockResolvedValueOnce(allProfiles as never)
      .mockResolvedValueOnce(top20ProfilesWithAssignments as never);
    const { getCrmShopsInitialData } = await import("@/lib/crm-page-data");
    const result = await getCrmShopsInitialData(ADMIN_USER);

    expect(prismaMock.shopProfile.findMany).toHaveBeenCalledTimes(2);
    expect(vi.mocked(prismaMock.shopProfile.findMany).mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        select: expect.objectContaining({
          shopName: true,
          classification: true,
        }),
      }),
    );
    expect(vi.mocked(prismaMock.shopProfile.findMany).mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        where: {
          shopName: {
            in: Array.from({ length: 20 }, (_, index) => `Shop ${String(index + 1).padStart(2, "0")}`),
          },
        },
      }),
    );
    expect(result.shops.data.shops).toHaveLength(20);
    expect(result.shops.data.shops[0]?.assignees).toEqual([
      {
        id: "user-1",
        name: "Nhân viên 1",
      },
    ]);
  });
});
