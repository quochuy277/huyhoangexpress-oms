import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DeliveryStatus } from "@prisma/client";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { parsePeriodFromURL } from "@/lib/finance-period";


const REVENUE_STATUSES: DeliveryStatus[] = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] as DeliveryStatus[];

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const range = parsePeriodFromURL(url);

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

    // Trend chart — SQL aggregate per month instead of fetching all records
    const trendFrom = startOfMonth(subMonths(new Date(), 5));
    const trendTo = endOfMonth(new Date());

    const [trendOrderRows, trendClaimRows, trendExpenseRows] = await Promise.all([
      prisma.$queryRaw<Array<{ month: string; revenue: number; carrier_cost: number }>>`
        SELECT TO_CHAR("createdTime", 'MM/YYYY') as month,
               COALESCE(SUM("totalFee"), 0)::float8 as revenue,
               COALESCE(SUM("carrierFee"), 0)::float8 as carrier_cost
        FROM "Order"
        WHERE "deliveryStatus" IN ('RECONCILED','RETURNED_FULL','RETURNED_PARTIAL')
          AND "createdTime" >= ${trendFrom} AND "createdTime" <= ${trendTo}
        GROUP BY TO_CHAR("createdTime", 'MM/YYYY')
      `,
      prisma.$queryRaw<Array<{ month: string; customer_comp: number; carrier_comp: number }>>`
        SELECT TO_CHAR("detectedDate", 'MM/YYYY') as month,
               COALESCE(SUM("customerCompensation"), 0)::float8 as customer_comp,
               COALESCE(SUM("carrierCompensation"), 0)::float8 as carrier_comp
        FROM "ClaimOrder"
        WHERE "detectedDate" >= ${trendFrom} AND "detectedDate" <= ${trendTo}
        GROUP BY TO_CHAR("detectedDate", 'MM/YYYY')
      `,
      prisma.$queryRaw<Array<{ month: string; total: number }>>`
        SELECT TO_CHAR("date", 'MM/YYYY') as month,
               COALESCE(SUM("amount"), 0)::float8 as total
        FROM "Expense"
        WHERE "date" >= ${trendFrom} AND "date" <= ${trendTo}
        GROUP BY TO_CHAR("date", 'MM/YYYY')
      `,
    ]);

    // Build trend data from SQL-aggregated results using Map lookups
    const orderMap = new Map(trendOrderRows.map(r => [r.month, r]));
    const claimMap = new Map(trendClaimRows.map(r => [r.month, r]));
    const expenseMap = new Map(trendExpenseRows.map(r => [r.month, r]));

    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(new Date(), i);
      const key = format(m, "MM/yyyy");

      const orderRow = orderMap.get(key);
      const profit = orderRow ? (orderRow.revenue - orderRow.carrier_cost) : 0;

      const claimRow = claimMap.get(key);
      const claimNetCost = claimRow ? (claimRow.customer_comp - claimRow.carrier_comp) : 0;

      const expenseRow = expenseMap.get(key);
      const expenseTotal = expenseRow ? expenseRow.total : 0;

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
