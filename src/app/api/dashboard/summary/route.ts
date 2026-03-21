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

  // ROW 2 & ROW 5 DATA: Finance & Rates
  if (isManagerOrAdmin) {
    // Current Month Finance
    const financeCurrent = await prisma.order.aggregate({
      _sum: { revenue: true, carrierFee: true },
      where: {
        deliveryStatus: { in: ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] },
        createdTime: { gte: startOfMonth }
      }
    });

    // Previous Month Finance
    const financePrevious = await prisma.order.aggregate({
      _sum: { revenue: true },
      where: {
        deliveryStatus: { in: ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] },
        createdTime: { gte: startOfPreviousMonth, lte: endOfPreviousMonth }
      }
    });

    // Order Counts
    const monthOrderCountCurrent = await prisma.order.count({
      where: { createdTime: { gte: startOfMonth } }
    });
    const monthOrderCountPrevious = await prisma.order.count({
      where: { createdTime: { gte: startOfPreviousMonth, lte: endOfPreviousMonth } }
    });

    // Negative Revenue Orders
    const negativeRevenueCount = await prisma.order.count({
      where: {
        revenue: { lt: 0 },
        deliveryStatus: { in: ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] },
        createdTime: { gte: startOfMonth }
      }
    });

    // Claims data for claimDiff
    const claims = await prisma.claimOrder.findMany({
      where: { detectedDate: { gte: startOfMonth, lte: new Date() } },
      select: { customerCompensation: true, carrierCompensation: true },
    });
    const customerComp = claims.reduce((s: number, c: any) => s + Number(c.customerCompensation ?? 0), 0);
    const carrierComp = claims.reduce((s: number, c: any) => s + Number(c.carrierCompensation ?? 0), 0);
    const claimDiff = carrierComp - customerComp;

    // Operating expenses
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: startOfMonth, lte: new Date() } },
    });
    const totalOperatingExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);

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
  }

  // Delivery Rates for ROW 5 (All Roles)
  const currentMonthTotal = await prisma.order.count({
    where: { createdTime: { gte: startOfMonth } }
  });

  const successStatus = await prisma.order.count({
    where: { deliveryStatus: { in: ["DELIVERED", "RECONCILED"] }, createdTime: { gte: startOfMonth } }
  });
  
  const returnStatus = await prisma.order.count({
    where: { deliveryStatus: { in: ["RETURNED_FULL", "RETURNED_PARTIAL"] }, createdTime: { gte: startOfMonth } }
  });

  const delayStatus = await prisma.order.count({
    where: { deliveryStatus: { in: ["DELIVERY_DELAYED", "RETURN_CONFIRMED"] }, createdTime: { gte: startOfMonth } }
  });

  responseData.deliveryRates = {
    successRate: currentMonthTotal > 0 ? (successStatus / currentMonthTotal) * 100 : 0,
    returnRate: currentMonthTotal > 0 ? (returnStatus / currentMonthTotal) * 100 : 0,
    delayRate: currentMonthTotal > 0 ? (delayStatus / currentMonthTotal) * 100 : 0,
  };

  return NextResponse.json(responseData);
}
