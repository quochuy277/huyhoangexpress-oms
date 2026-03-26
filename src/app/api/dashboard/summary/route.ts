import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { DeliveryStatus } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const role = session.user.role;
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

  // ROW 1 DATA: All Roles
  const [
    todayOrderCount,
    yesterdayOrderCount,
    delayedStatusCount,
    delayedNotesCount,
    returningCount,
    overdueClaimsCount
  ] = await Promise.all([
    // Orders today
    prisma.order.count({ where: { createdTime: { gte: today, lt: tomorrow } } }),
    // Orders yesterday
    prisma.order.count({ where: { createdTime: { gte: yesterday, lt: today } } }),
    // Delayed status (Problem)
    prisma.order.count({ where: { deliveryStatus: { in: ["DELIVERY_DELAYED", "RETURN_CONFIRMED"] } } }),
    // Delayed notes (DELIVERING + Hoãn giao hàng)
    prisma.order.count({
      where: {
        deliveryStatus: "DELIVERING",
        publicNotes: { contains: "Hoãn giao hàng" }
      }
    }),
    // Returning
    prisma.order.count({ where: { deliveryStatus: { in: ["RETURN_DELAYED", "RETURNING_FULL"] } } }),
    // Overdue claims
    prisma.claimOrder.count({
      where: {
        claimStatus: { notIn: ["RESOLVED", "CARRIER_COMPENSATED", "CUSTOMER_COMPENSATED", "CARRIER_REJECTED", "CUSTOMER_REJECTED"] },
        deadline: { lt: new Date() }
      }
    }),
  ]);

  const responseData: any = {
    todayOrderCount,
    yesterdayOrderCount,
    delayedCareCount: delayedStatusCount + delayedNotesCount,
    returningCount,
    overdueClaimsCount,
  };

  // ROW 2 & ROW 5 DATA: Finance & Rates — all queries run in parallel
  // Delivery Rates: single groupBy instead of 4 separate count queries
  const deliveryRatesPromise = prisma.order.groupBy({
    by: ["deliveryStatus"],
    _count: true,
    where: { createdTime: { gte: startOfMonth } },
  });

  if (isManagerOrAdmin) {
    const [
      financeCurrent,
      financePrevious,
      monthOrderCountCurrent,
      monthOrderCountPrevious,
      negativeRevenueCount,
      claims,
      expenses,
      statusGroups,
    ] = await Promise.all([
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

    // Compute delivery rates from groupBy result
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
    // Non-admin: only delivery rates
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

  return NextResponse.json(responseData, {
    headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" },
  });
}
