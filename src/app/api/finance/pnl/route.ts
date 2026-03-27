import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DeliveryStatus } from "@prisma/client";
import { startOfMonth, endOfMonth } from "date-fns";
import { requireFinanceAccess } from "@/lib/finance-auth";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);

    let from: Date, to: Date, label: string;
    if (fromParam && toParam) {
      from = new Date(fromParam);
      to = new Date(toParam);
      to.setHours(23, 59, 59, 999);
      label = `${fromParam} → ${toParam}`;
    } else {
      const [year, mon] = month.split("-").map(Number);
      from = startOfMonth(new Date(year, mon - 1));
      to = endOfMonth(new Date(year, mon - 1));
      label = month;
    }

    // Auto revenue from orders using aggregate
    const REVENUE_STATUSES: DeliveryStatus[] = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] as DeliveryStatus[];
    const [orderAgg, claimAgg] = await Promise.all([
      prisma.order.aggregate({
        where: { deliveryStatus: { in: REVENUE_STATUSES }, createdTime: { gte: from, lte: to } },
        _sum: { totalFee: true, carrierFee: true },
      }),
      prisma.claimOrder.aggregate({
        where: { detectedDate: { gte: from, lte: to } },
        _sum: { customerCompensation: true, carrierCompensation: true },
      }),
    ]);

    const totalFeeFromShop = Number(orderAgg._sum.totalFee ?? 0);
    const totalCarrierFee = Number(orderAgg._sum.carrierFee ?? 0);
    const netRevenue = totalFeeFromShop - totalCarrierFee;

    // Auto claims data from aggregate
    const customerComp = Number(claimAgg._sum.customerCompensation ?? 0);
    const carrierComp = Number(claimAgg._sum.carrierCompensation ?? 0);
    const claimDiff = carrierComp - customerComp; // negative if we pay more than carrier pays us

    const grossProfit = netRevenue + claimDiff;

    // Manual expenses grouped by category — aggregate at DB level
    const expenseGroups = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: { date: { gte: from, lte: to } },
      _sum: { amount: true },
    });

    // Fetch category names for the groups (only categories that have expenses)
    const catIds = expenseGroups.map(g => g.categoryId);
    const catRecords = catIds.length > 0
      ? await prisma.expenseCategory.findMany({
          where: { id: { in: catIds } },
          select: { id: true, name: true, sortOrder: true },
        })
      : [];
    const catMap = new Map(catRecords.map(c => [c.id, c]));

    const operatingExpenses = expenseGroups
      .map(g => {
        const cat = catMap.get(g.categoryId);
        return {
          name: cat?.name || "Khác",
          total: Number(g._sum.amount || 0),
          sortOrder: cat?.sortOrder || 999,
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const totalOperatingExpenses = operatingExpenses.reduce((s, c) => s + c.total, 0);

    const netProfit = grossProfit - totalOperatingExpenses;

    return NextResponse.json({
      revenue: { totalFeeFromShop, totalCarrierFee, netRevenue },
      claims: { customerComp, carrierComp, claimDiff },
      grossProfit,
      operatingExpenses,
      totalOperatingExpenses,
      netProfit,
      month: label,
    });
  } catch (error) {
    console.error("P&L error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
