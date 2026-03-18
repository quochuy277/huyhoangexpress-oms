import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { requireFinanceAccess } from "@/lib/finance-auth";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "month";
    const now = new Date();
    let from = startOfMonth(now), to = now;
    if (period === "last_month") { from = startOfMonth(subMonths(now, 1)); to = endOfMonth(subMonths(now, 1)); }
    else if (period === "quarter") { from = subMonths(startOfMonth(now), 2); }
    else if (period === "year") { from = new Date(now.getFullYear(), 0, 1); }

    const orders = await prisma.order.findMany({
      where: { revenue: { lt: 0 }, createdTime: { gte: from, lte: to } },
      select: {
        requestCode: true, carrierName: true, creatorShopName: true, status: true, deliveryStatus: true,
        totalFee: true, carrierFee: true, revenue: true, codAmount: true, regionGroup: true,
      },
      orderBy: { revenue: "asc" },
    });

    const totalLoss = orders.reduce((s, o) => s + Number(o.revenue ?? 0), 0);

    // Most frequent carrier
    const carrierCount: Record<string, number> = {};
    orders.forEach(o => {
      const c = o.carrierName || "Khác";
      carrierCount[c] = (carrierCount[c] || 0) + 1;
    });
    const topCarrier = Object.entries(carrierCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    // Most common reason
    const returnCount = orders.filter(o => o.deliveryStatus === "RETURNED_FULL" || o.deliveryStatus === "RETURNED_PARTIAL").length;
    const feeOverCount = orders.length - returnCount;
    const topReason = returnCount >= feeOverCount ? "Đơn hoàn" : "Phí vượt";

    return NextResponse.json({
      summary: { totalOrders: orders.length, totalLoss, topCarrier, topReason },
      orders,
    });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
