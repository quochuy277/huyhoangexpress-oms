import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format, startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "month";
    const now = new Date();
    let from = startOfMonth(now), to = now;
    if (period === "last_month") { from = startOfMonth(subMonths(now, 1)); to = endOfMonth(subMonths(now, 1)); }
    else if (period === "quarter") { from = subMonths(startOfMonth(now), 2); }

    const entries = await prisma.cashbookEntry.findMany({
      where: { transactionTime: { gte: from, lte: to } },
      orderBy: { transactionTime: "desc" },
    });

    // Summary cards
    const codTotal = entries.filter(e => e.groupType === "COD").reduce((s, e) => s + e.amount, 0);
    const codCount = entries.filter(e => e.groupType === "COD").length;
    const shopPayoutTotal = entries.filter(e => e.groupType === "SHOP_PAYOUT").reduce((s, e) => s + e.amount, 0);
    const shopPayoutCount = entries.filter(e => e.groupType === "SHOP_PAYOUT").length;
    const topUpTotal = entries.filter(e => e.groupType === "TOP_UP").reduce((s, e) => s + e.amount, 0);
    const topUpCount = entries.filter(e => e.groupType === "TOP_UP").length;
    const latestBalance = entries.length > 0 ? entries[0].balance : 0;
    const latestDate = entries.length > 0 ? entries[0].transactionTime : null;

    // Daily cashflow chart
    const dailyMap: Record<string, { codIn: number; shopOut: number; balance: number }> = {};
    entries.forEach(e => {
      const day = format(e.transactionTime, "dd/MM");
      if (!dailyMap[day]) dailyMap[day] = { codIn: 0, shopOut: 0, balance: e.balance };
      if (e.groupType === "COD") dailyMap[day].codIn += e.amount;
      if (e.groupType === "SHOP_PAYOUT") dailyMap[day].shopOut += Math.abs(e.amount);
      dailyMap[day].balance = e.balance; // latest balance of that day
    });
    const dailyChart = Object.entries(dailyMap).map(([date, v]) => ({ date, ...v })).reverse();

    // Group distribution
    const groupMap: Record<string, number> = {};
    entries.forEach(e => { groupMap[e.groupType] = (groupMap[e.groupType] || 0) + Math.abs(e.amount); });
    const groupDistribution = Object.entries(groupMap).map(([group, amount]) => ({ group, amount }));

    // Shop payout summary
    const shopMap: Record<string, { count: number; total: number; lastDate: Date | null }> = {};
    entries.filter(e => e.groupType === "SHOP_PAYOUT").forEach(e => {
      const s = e.shopName || "Không rõ";
      if (!shopMap[s]) shopMap[s] = { count: 0, total: 0, lastDate: null };
      shopMap[s].count++;
      shopMap[s].total += Math.abs(e.amount);
      if (!shopMap[s].lastDate || e.transactionTime > shopMap[s].lastDate!) shopMap[s].lastDate = e.transactionTime;
    });
    // Count reconciliation fees per shop
    const feeMap: Record<string, number> = {};
    entries.filter(e => e.groupType === "RECONCILIATION_FEE").forEach(e => {
      const s = e.shopName || "Không rõ";
      feeMap[s] = (feeMap[s] || 0) + Math.abs(e.amount);
    });
    const shopPayoutSummary = Object.entries(shopMap)
      .map(([shop, v]) => ({ shop, ...v, fee: feeMap[shop] || 0 }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      summary: { codTotal, codCount, shopPayoutTotal, shopPayoutCount, topUpTotal, topUpCount, latestBalance, latestDate },
      dailyChart,
      groupDistribution,
      shopPayoutSummary,
    });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
