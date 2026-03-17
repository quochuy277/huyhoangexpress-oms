import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeliveryStatus } from "@prisma/client";
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, startOfYear } from "date-fns";

function getDateRange(period: string, from?: string, to?: string) {
  const now = new Date();
  switch (period) {
    case "last_month": return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
    case "quarter": return { from: startOfQuarter(now), to: now };
    case "half": return { from: subMonths(startOfMonth(now), 5), to: now };
    case "year": return { from: startOfYear(now), to: now };
    case "custom": return { from: from ? new Date(from) : subMonths(now, 1), to: to ? new Date(to) : now };
    default: return { from: startOfMonth(now), to: now }; // month
  }
}

const REVENUE_STATUSES: DeliveryStatus[] = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] as DeliveryStatus[];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "month";
    const range = getDateRange(period, url.searchParams.get("from") || undefined, url.searchParams.get("to") || undefined);

    // Summary cards — from revenue-eligible orders (RECONCILED, RETURNED_FULL, RETURNED_PARTIAL)
    const orders = await prisma.order.findMany({
      where: {
        deliveryStatus: { in: REVENUE_STATUSES },
        createdTime: { gte: range.from, lte: range.to },
      },
      select: { totalFee: true, carrierFee: true, codAmount: true, carrierName: true, shopName: true },
    });

    const totalRevenue = orders.reduce((s, o) => s + (o.totalFee || 0), 0);
    const totalCarrierFee = orders.reduce((s, o) => s + (o.carrierFee || 0), 0);
    const grossProfit = totalRevenue - totalCarrierFee; // Doanh thu ròng
    const totalCod = orders.filter(o => o.codAmount).reduce((s, o) => s + (o.codAmount || 0), 0);
    const orderCount = orders.length;
    const margin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;

    // Previous period for comparison (compare grossProfit = DR ròng)
    const duration = range.to.getTime() - range.from.getTime();
    const prevFrom = new Date(range.from.getTime() - duration);
    const prevTo = new Date(range.from.getTime() - 1);
    const prevOrders = await prisma.order.findMany({
      where: { deliveryStatus: { in: REVENUE_STATUSES }, createdTime: { gte: prevFrom, lte: prevTo } },
      select: { carrierFee: true, totalFee: true },
    });
    const prevGrossProfit = prevOrders.reduce((s, o) => s + (o.totalFee || 0) - (o.carrierFee || 0), 0);
    const revenueChange = prevGrossProfit > 0 ? Math.round(((grossProfit - prevGrossProfit) / prevGrossProfit) * 100) : 0;

    // Trend chart — last 6 months (fetch all at once, group by month)
    const trendFrom = startOfMonth(subMonths(new Date(), 5));
    const trendTo = endOfMonth(new Date());
    const [trendOrders, trendClaims, trendExpenses] = await Promise.all([
      prisma.order.findMany({
        where: { deliveryStatus: { in: REVENUE_STATUSES }, createdTime: { gte: trendFrom, lte: trendTo } },
        select: { totalFee: true, carrierFee: true, createdTime: true },
      }),
      prisma.claimOrder.findMany({
        where: { detectedDate: { gte: trendFrom, lte: trendTo } },
        select: { customerCompensation: true, carrierCompensation: true, detectedDate: true },
      }),
      prisma.expense.findMany({
        where: { date: { gte: trendFrom, lte: trendTo } },
        select: { amount: true, date: true },
      }),
    ]);

    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(new Date(), i);
      const key = format(m, "MM/yyyy");
      const mFrom = startOfMonth(m);
      const mTo = endOfMonth(m);

      const mOrders = trendOrders.filter(o => o.createdTime && o.createdTime >= mFrom && o.createdTime <= mTo);
      const rev = mOrders.reduce((s, o) => s + (o.totalFee || 0), 0);
      const carrierCost = mOrders.reduce((s, o) => s + (o.carrierFee || 0), 0);
      const profit = rev - carrierCost; // Doanh thu ròng

      const mClaims = trendClaims.filter(c => c.detectedDate && c.detectedDate >= mFrom && c.detectedDate <= mTo);
      const claimNetCost = mClaims.reduce((s, c) => s + (c.customerCompensation || 0) - (c.carrierCompensation || 0), 0);

      const mExpenses = trendExpenses.filter(e => e.date >= mFrom && e.date <= mTo);
      const expenseTotal = mExpenses.reduce((s, e) => s + e.amount, 0);

      const totalCost = Math.max(0, claimNetCost) + expenseTotal;

      trendData.push({ month: key, profit, totalCost });
    }

    // Distribution by carrier
    const carrierMap: Record<string, { revenue: number; fee: number; count: number }> = {};
    orders.forEach(o => {
      const c = o.carrierName || "Khác";
      if (!carrierMap[c]) carrierMap[c] = { revenue: 0, fee: 0, count: 0 };
      carrierMap[c].revenue += o.totalFee || 0;
      carrierMap[c].fee += o.carrierFee || 0;
      carrierMap[c].count++;
    });
    const carrierDistribution = Object.entries(carrierMap).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue);

    // Distribution by shop
    const shopMap: Record<string, number> = {};
    orders.forEach(o => {
      const s = o.shopName || "Khác";
      shopMap[s] = (shopMap[s] || 0) + (o.totalFee || 0) - (o.carrierFee || 0);
    });
    const shopDistribution = Object.entries(shopMap).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 15);

    return NextResponse.json({
      summary: { totalRevenue, totalCarrierFee, grossProfit, totalCod, orderCount, margin, revenueChange },
      trendData,
      carrierDistribution,
      shopDistribution,
    });
  } catch (error) {
    console.error("Finance overview error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
