import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DeliveryStatus } from "@prisma/client";
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, startOfYear } from "date-fns";
import { requireFinanceAccess } from "@/lib/finance-auth";

function getDateRange(period: string, from?: string, to?: string) {
  const now = new Date();
  switch (period) {
    case "last_month": return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
    case "quarter": return { from: startOfQuarter(now), to: now };
    case "half": return { from: subMonths(startOfMonth(now), 5), to: now };
    case "year": return { from: startOfYear(now), to: now };
    case "custom": return { from: from ? new Date(from) : subMonths(now, 1), to: to ? new Date(to) : now };
    default: return { from: startOfMonth(now), to: now };
  }
}

const REVENUE_STATUSES: DeliveryStatus[] = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] as DeliveryStatus[];

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "month";
    const range = getDateRange(period, url.searchParams.get("from") || undefined, url.searchParams.get("to") || undefined);

    const revenueWhere = {
      deliveryStatus: { in: REVENUE_STATUSES },
      createdTime: { gte: range.from, lte: range.to },
    };

    // Summary cards — use aggregate instead of fetch-all
    const [summaryAgg, orderCount, codAgg] = await Promise.all([
      prisma.order.aggregate({
        where: revenueWhere,
        _sum: { totalFee: true, carrierFee: true },
      }),
      prisma.order.count({ where: revenueWhere }),
      prisma.order.aggregate({
        where: { ...revenueWhere, codAmount: { gt: 0 } },
        _sum: { codAmount: true },
      }),
    ]);

    const totalRevenue = Number(summaryAgg._sum.totalFee ?? 0);
    const totalCarrierFee = Number(summaryAgg._sum.carrierFee ?? 0);
    const grossProfit = totalRevenue - totalCarrierFee;
    const totalCod = Number(codAgg._sum.codAmount ?? 0);
    const margin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 1000) / 10 : 0;

    // Previous period — also use aggregate
    const duration = range.to.getTime() - range.from.getTime();
    const prevFrom = new Date(range.from.getTime() - duration);
    const prevTo = new Date(range.from.getTime() - 1);
    const prevAgg = await prisma.order.aggregate({
      where: { deliveryStatus: { in: REVENUE_STATUSES }, createdTime: { gte: prevFrom, lte: prevTo } },
      _sum: { totalFee: true, carrierFee: true },
    });
    const prevGrossProfit = Number(prevAgg._sum.totalFee ?? 0) - Number(prevAgg._sum.carrierFee ?? 0);
    const revenueChange = prevGrossProfit > 0 ? Math.round(((grossProfit - prevGrossProfit) / prevGrossProfit) * 100) : 0;

    // Trend chart — still needs per-month grouping, use groupBy
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
      const rev = mOrders.reduce((s, o) => s + Number(o.totalFee ?? 0), 0);
      const carrierCost = mOrders.reduce((s, o) => s + Number(o.carrierFee ?? 0), 0);
      const profit = rev - carrierCost;

      const mClaims = trendClaims.filter(c => c.detectedDate && c.detectedDate >= mFrom && c.detectedDate <= mTo);
      const claimNetCost = mClaims.reduce((s, c) => s + Number(c.customerCompensation ?? 0) - Number(c.carrierCompensation ?? 0), 0);

      const mExpenses = trendExpenses.filter(e => e.date >= mFrom && e.date <= mTo);
      const expenseTotal = mExpenses.reduce((s, e) => s + Number(e.amount), 0);

      const totalCost = Math.max(0, claimNetCost) + expenseTotal;
      trendData.push({ month: key, profit, totalCost });
    }

    // Carrier distribution — use groupBy
    const carrierGroups = await prisma.order.groupBy({
      by: ["carrierName"],
      where: revenueWhere,
      _sum: { totalFee: true, carrierFee: true },
      _count: true,
    });
    const carrierDistribution = carrierGroups
      .map(g => ({
        name: g.carrierName || "Khác",
        revenue: Number(g._sum.totalFee ?? 0),
        fee: Number(g._sum.carrierFee ?? 0),
        count: g._count,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Shop distribution — use groupBy
    const shopGroups = await prisma.order.groupBy({
      by: ["shopName"],
      where: revenueWhere,
      _sum: { totalFee: true, carrierFee: true },
    });
    const shopDistribution = shopGroups
      .map(g => ({
        name: g.shopName || "Khác",
        revenue: Number(g._sum.totalFee ?? 0) - Number(g._sum.carrierFee ?? 0),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

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
