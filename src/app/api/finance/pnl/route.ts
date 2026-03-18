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
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split("-").map(Number);
    const from = startOfMonth(new Date(year, mon - 1));
    const to = endOfMonth(new Date(year, mon - 1));

    // Auto revenue from orders
    const REVENUE_STATUSES: DeliveryStatus[] = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"] as DeliveryStatus[];
    const orders = await prisma.order.findMany({
      where: { deliveryStatus: { in: REVENUE_STATUSES }, createdTime: { gte: from, lte: to } },
      select: { totalFee: true, carrierFee: true },
    });
    const totalFeeFromShop = orders.reduce((s, o) => s + Number(o.totalFee ?? 0), 0);
    const totalCarrierFee = orders.reduce((s, o) => s + Number(o.carrierFee ?? 0), 0);
    const netRevenue = totalFeeFromShop - totalCarrierFee;

    // Auto claims data
    const claims = await prisma.claimOrder.findMany({
      where: { detectedDate: { gte: from, lte: to } },
      select: { customerCompensation: true, carrierCompensation: true },
    });
    const customerComp = claims.reduce((s, c) => s + Number(c.customerCompensation ?? 0), 0);
    const carrierComp = claims.reduce((s, c) => s + Number(c.carrierCompensation ?? 0), 0);
    const claimDiff = carrierComp - customerComp; // negative if we pay more than carrier pays us

    const grossProfit = netRevenue + claimDiff;

    // Manual expenses grouped by category
    const expenses = await prisma.expense.findMany({
      where: { date: { gte: from, lte: to } },
      include: { category: { select: { name: true, sortOrder: true } } },
    });

    const categoryTotals: Record<string, { name: string; total: number; sortOrder: number }> = {};
    expenses.forEach(e => {
      const cid = e.categoryId;
      if (!categoryTotals[cid]) categoryTotals[cid] = { name: e.category.name, total: 0, sortOrder: e.category.sortOrder };
      categoryTotals[cid].total += Number(e.amount);
    });
    const operatingExpenses = Object.values(categoryTotals).sort((a, b) => a.sortOrder - b.sortOrder);
    const totalOperatingExpenses = operatingExpenses.reduce((s, c) => s + c.total, 0);

    const netProfit = grossProfit - totalOperatingExpenses;

    return NextResponse.json({
      revenue: { totalFeeFromShop, totalCarrierFee, netRevenue },
      claims: { customerComp, carrierComp, claimDiff },
      grossProfit,
      operatingExpenses,
      totalOperatingExpenses,
      netProfit,
      month,
    });
  } catch (error) {
    console.error("P&L error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
