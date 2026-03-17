import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeliveryStatus } from "@prisma/client";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

const COMPLETED: DeliveryStatus[] = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL", "DELIVERED"] as DeliveryStatus[];

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
    else if (period === "year") { from = new Date(now.getFullYear(), 0, 1); }

    const orders = await prisma.order.findMany({
      where: { deliveryStatus: { in: COMPLETED }, createdTime: { gte: from, lte: to } },
      select: { carrierName: true, totalFee: true, carrierFee: true, revenue: true, codAmount: true, returnFee: true, deliveryStatus: true },
    });

    const map: Record<string, any> = {};
    orders.forEach(o => {
      const c = o.carrierName || "Khác";
      if (!map[c]) map[c] = { carrier: c, orderCount: 0, totalFee: 0, carrierFee: 0, revenue: 0, negativeCount: 0, returnFee: 0, codTotal: 0 };
      map[c].orderCount++;
      map[c].totalFee += o.totalFee || 0;
      map[c].carrierFee += o.carrierFee || 0;
      map[c].revenue += o.revenue || 0;
      map[c].codTotal += o.codAmount || 0;
      if ((o.revenue || 0) < 0) map[c].negativeCount++;
      if (o.deliveryStatus === "RETURNED_FULL" || o.deliveryStatus === "RETURNED_PARTIAL") map[c].returnFee += o.returnFee || 0;
    });

    const carriers = Object.values(map)
      .map((c: any) => ({ ...c, margin: c.totalFee > 0 ? Math.round((c.revenue / c.totalFee) * 1000) / 10 : 0 }))
      .sort((a: any, b: any) => b.revenue - a.revenue);

    return NextResponse.json({ carriers });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
