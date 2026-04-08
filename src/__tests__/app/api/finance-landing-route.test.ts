import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      aggregate: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    claimOrder: {
      aggregate: vi.fn(),
    },
    expense: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    expenseCategory: {
      findMany: vi.fn(),
    },
    monthlyBudget: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSession() {
  return {
    user: {
      id: "user-1",
      name: "Quản lý",
      role: "MANAGER",
      permissions: {
        canViewFinancePage: true,
      },
    },
  };
}

describe("finance landing route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T10:00:00.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a first-paint payload and computes budgets with groupBy instead of raw expense rows", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);

    vi.mocked(prisma.order.aggregate)
      .mockResolvedValueOnce({
        _sum: { totalFee: 1_200_000, carrierFee: 400_000 },
      } as never)
      .mockResolvedValueOnce({
        _sum: { codAmount: 5_000_000 },
      } as never)
      .mockResolvedValueOnce({
        _sum: { totalFee: 1_000_000, carrierFee: 300_000 },
      } as never)
      .mockResolvedValueOnce({
        _sum: { totalFee: 1_200_000, carrierFee: 400_000 },
      } as never);

    vi.mocked(prisma.order.count).mockResolvedValue(10 as never);
    vi.mocked(prisma.order.groupBy)
      .mockResolvedValueOnce([
        {
          carrierName: "GHN",
          _sum: { totalFee: 1_200_000, carrierFee: 400_000 },
          _count: 10,
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          shopName: "Shop A",
          _sum: { totalFee: 1_200_000, carrierFee: 400_000 },
        },
      ] as never);

    vi.mocked(prisma.claimOrder.aggregate).mockResolvedValue({
      _sum: { customerCompensation: 100_000, carrierCompensation: 30_000 },
    } as never);

    vi.mocked(prisma.expense.groupBy)
      .mockResolvedValueOnce([
        { categoryId: "cat-1", _sum: { amount: 200_000 } },
      ] as never)
      .mockResolvedValueOnce([
        { categoryId: "cat-1", _sum: { amount: 200_000 } },
        { categoryId: "cat-2", _sum: { amount: 50_000 } },
      ] as never);

    vi.mocked(prisma.expenseCategory.findMany).mockResolvedValue([
      { id: "cat-1", name: "Marketing", isSystem: false, sortOrder: 1 },
      { id: "cat-2", name: "Vận hành", isSystem: true, sortOrder: 2 },
    ] as never);

    vi.mocked(prisma.monthlyBudget.findMany).mockResolvedValue([
      { categoryId: "cat-1", budgetAmount: 500_000 },
    ] as never);

    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([
        { month: "04/2026", revenue: 1_200_000, carrier_cost: 400_000 },
      ] as never)
      .mockResolvedValueOnce([
        { month: "04/2026", customer_comp: 100_000, carrier_comp: 30_000 },
      ] as never)
      .mockResolvedValueOnce([
        { month: "04/2026", total: 200_000 },
      ] as never);

    const { GET } = await import("@/app/api/finance/landing/route");
    const response = await GET(new NextRequest("http://localhost/api/finance/landing?period=month"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({
      grossProfit: 800_000,
      totalCod: 5_000_000,
      orderCount: 10,
    });
    expect(body.pnl).toMatchObject({
      grossProfit: 730_000,
      totalOperatingExpenses: 200_000,
      netProfit: 530_000,
    });
    expect(body.categories).toEqual([
      expect.objectContaining({ id: "cat-1", name: "Marketing" }),
      expect.objectContaining({ id: "cat-2", name: "Vận hành" }),
    ]);
    expect(body.budgets).toMatchObject({
      month: "2026-04",
      budgets: [
        expect.objectContaining({
          categoryId: "cat-1",
          spent: 200_000,
          remaining: 300_000,
          ratio: 40,
        }),
        expect.objectContaining({
          categoryId: "cat-2",
          spent: 50_000,
          remaining: -50_000,
          ratio: 0,
        }),
      ],
    });
    expect(body.trendData).toHaveLength(6);
    expect(vi.mocked(prisma.expense.findMany)).not.toHaveBeenCalled();
  }, 30000);

  it("allows ADMIN users even when a custom permission group disables canViewFinancePage", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "admin-1",
        name: "Quản trị",
        role: "ADMIN",
        permissions: {
          canViewFinancePage: false,
        },
      },
    } as never);

    vi.mocked(prisma.order.aggregate)
      .mockResolvedValueOnce({
        _sum: { totalFee: 1_200_000, carrierFee: 400_000 },
      } as never)
      .mockResolvedValueOnce({
        _sum: { codAmount: 5_000_000 },
      } as never)
      .mockResolvedValueOnce({
        _sum: { totalFee: 1_000_000, carrierFee: 300_000 },
      } as never)
      .mockResolvedValueOnce({
        _sum: { totalFee: 1_200_000, carrierFee: 400_000 },
      } as never);

    vi.mocked(prisma.order.count).mockResolvedValue(10 as never);
    vi.mocked(prisma.order.groupBy)
      .mockResolvedValueOnce([
        {
          carrierName: "GHN",
          _sum: { totalFee: 1_200_000, carrierFee: 400_000 },
          _count: 10,
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          shopName: "Shop A",
          _sum: { totalFee: 1_200_000, carrierFee: 400_000 },
        },
      ] as never);

    vi.mocked(prisma.claimOrder.aggregate).mockResolvedValue({
      _sum: { customerCompensation: 100_000, carrierCompensation: 30_000 },
    } as never);

    vi.mocked(prisma.expense.groupBy)
      .mockResolvedValueOnce([
        { categoryId: "cat-1", _sum: { amount: 200_000 } },
      ] as never)
      .mockResolvedValueOnce([
        { categoryId: "cat-1", _sum: { amount: 200_000 } },
        { categoryId: "cat-2", _sum: { amount: 50_000 } },
      ] as never);

    vi.mocked(prisma.expenseCategory.findMany).mockResolvedValue([
      { id: "cat-1", name: "Marketing", isSystem: false, sortOrder: 1 },
      { id: "cat-2", name: "Vận hành", isSystem: true, sortOrder: 2 },
    ] as never);

    vi.mocked(prisma.monthlyBudget.findMany).mockResolvedValue([
      { categoryId: "cat-1", budgetAmount: 500_000 },
    ] as never);

    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([
        { month: "04/2026", revenue: 1_200_000, carrier_cost: 400_000 },
      ] as never)
      .mockResolvedValueOnce([
        { month: "04/2026", customer_comp: 100_000, carrier_comp: 30_000 },
      ] as never)
      .mockResolvedValueOnce([
        { month: "04/2026", total: 200_000 },
      ] as never);

    const { GET } = await import("@/app/api/finance/landing/route");
    const response = await GET(new NextRequest("http://localhost/api/finance/landing?period=month"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({
      grossProfit: 800_000,
      orderCount: 10,
    });
  });
});
