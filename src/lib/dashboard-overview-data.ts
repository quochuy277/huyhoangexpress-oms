import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

function toNumber(value: unknown) {
  if (value == null) return value;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return value;
}

export function normalizeDashboardSummaryData(data: any) {
  return {
    ...data,
    revenue: data.revenue
      ? {
          current: toNumber(data.revenue.current) ?? 0,
          previousMonth: toNumber(data.revenue.previousMonth) ?? 0,
        }
      : undefined,
    cost: data.cost
      ? {
          current: toNumber(data.cost.current) ?? 0,
          claimDiff: toNumber(data.cost.claimDiff) ?? 0,
          totalOperatingExpenses: toNumber(data.cost.totalOperatingExpenses) ?? 0,
        }
      : undefined,
  };
}

export async function getDashboardSummaryData(role: Role | string | null | undefined) {
  const isManagerOrAdmin = role === "ADMIN" || role === "MANAGER";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

  const [todayOrderCount, yesterdayOrderCount, delayedStatusCount, delayedNotesCount, returningCount, overdueClaimsCount] = await Promise.all([
    prisma.order.count({ where: { createdTime: { gte: today, lt: tomorrow } } }),
    prisma.order.count({ where: { createdTime: { gte: yesterday, lt: today } } }),
    prisma.order.count({ where: { deliveryStatus: { in: ["DELIVERY_DELAYED", "RETURN_CONFIRMED"] } } }),
    prisma.order.count({
      where: {
        deliveryStatus: "DELIVERING",
        publicNotes: { contains: "Hoãn giao hàng" },
      },
    }),
    prisma.order.count({ where: { deliveryStatus: { in: ["RETURN_DELAYED", "RETURNING_FULL"] } } }),
    prisma.claimOrder.count({
      where: {
        claimStatus: { notIn: ["RESOLVED", "CARRIER_COMPENSATED", "CUSTOMER_COMPENSATED", "CARRIER_REJECTED", "CUSTOMER_REJECTED"] },
        deadline: { lt: new Date() },
      },
    }),
  ]);

  const responseData: any = {
    todayOrderCount,
    yesterdayOrderCount,
    delayedCareCount: delayedStatusCount + delayedNotesCount,
    returningCount,
    overdueClaimsCount,
  };

  const deliveryRatesPromise = prisma.order.groupBy({
    by: ["deliveryStatus"],
    _count: true,
    where: { createdTime: { gte: startOfMonth } },
  });

  if (isManagerOrAdmin) {
    const [financeCurrent, financePrevious, monthOrderCountCurrent, monthOrderCountPrevious, negativeRevenueCount, claims, expenses, statusGroups] = await Promise.all([
      prisma.order.aggregate({
        _sum: { revenue: true, carrierFee: true },
        where: {
          deliveryStatus: { in: ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] },
          createdTime: { gte: startOfMonth },
        },
      }),
      prisma.order.aggregate({
        _sum: { revenue: true },
        where: {
          deliveryStatus: { in: ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] },
          createdTime: { gte: startOfPreviousMonth, lte: endOfPreviousMonth },
        },
      }),
      prisma.order.count({ where: { createdTime: { gte: startOfMonth } } }),
      prisma.order.count({ where: { createdTime: { gte: startOfPreviousMonth, lte: endOfPreviousMonth } } }),
      prisma.order.count({
        where: {
          revenue: { lt: 0 },
          deliveryStatus: { in: ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] },
          createdTime: { gte: startOfMonth },
        },
      }),
      prisma.claimOrder.aggregate({
        where: { detectedDate: { gte: startOfMonth, lte: new Date() } },
        _sum: { customerCompensation: true, carrierCompensation: true },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: startOfMonth, lte: new Date() } },
        _sum: { amount: true },
      }),
      deliveryRatesPromise,
    ]);

    const customerComp = Number(claims._sum.customerCompensation ?? 0);
    const carrierComp = Number(claims._sum.carrierCompensation ?? 0);
    const claimDiff = carrierComp - customerComp;
    const totalOperatingExpenses = Number(expenses._sum.amount ?? 0);

    responseData.revenue = {
      current: (financeCurrent as any)._sum?.revenue ?? 0,
      previousMonth: (financePrevious as any)._sum?.revenue ?? 0,
    };
    responseData.cost = {
      current: Math.abs(claimDiff) + totalOperatingExpenses,
      claimDiff,
      totalOperatingExpenses,
    };
    responseData.monthOrderCount = {
      current: monthOrderCountCurrent,
      previousMonth: monthOrderCountPrevious,
    };
    responseData.negativeRevenueCount = negativeRevenueCount;

    const statusMap = new Map(statusGroups.map((g) => [g.deliveryStatus, g._count]));
    const currentMonthTotal = monthOrderCountCurrent;
    const successCount = (statusMap.get("DELIVERED") ?? 0) + (statusMap.get("RECONCILED") ?? 0);
    const returnCount = (statusMap.get("RETURNED_FULL") ?? 0) + (statusMap.get("RETURNED_PARTIAL") ?? 0);
    const delayCount = (statusMap.get("DELIVERY_DELAYED") ?? 0) + (statusMap.get("RETURN_CONFIRMED") ?? 0);

    responseData.deliveryRates = {
      successRate: currentMonthTotal > 0 ? (successCount / currentMonthTotal) * 100 : 0,
      returnRate: currentMonthTotal > 0 ? (returnCount / currentMonthTotal) * 100 : 0,
      delayRate: currentMonthTotal > 0 ? (delayCount / currentMonthTotal) * 100 : 0,
    };
  } else {
    const statusGroups = await deliveryRatesPromise;
    const statusMap = new Map(statusGroups.map((g) => [g.deliveryStatus, g._count]));
    const currentMonthTotal = statusGroups.reduce((sum, g) => sum + g._count, 0);
    const successCount = (statusMap.get("DELIVERED") ?? 0) + (statusMap.get("RECONCILED") ?? 0);
    const returnCount = (statusMap.get("RETURNED_FULL") ?? 0) + (statusMap.get("RETURNED_PARTIAL") ?? 0);
    const delayCount = (statusMap.get("DELIVERY_DELAYED") ?? 0) + (statusMap.get("RETURN_CONFIRMED") ?? 0);

    responseData.deliveryRates = {
      successRate: currentMonthTotal > 0 ? (successCount / currentMonthTotal) * 100 : 0,
      returnRate: currentMonthTotal > 0 ? (returnCount / currentMonthTotal) * 100 : 0,
      delayRate: currentMonthTotal > 0 ? (delayCount / currentMonthTotal) * 100 : 0,
    };
  }

  return normalizeDashboardSummaryData(responseData);
}
