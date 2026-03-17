import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

const REVENUE_STATUSES = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"];
const DELIVERED_OK = ["DELIVERED", "RECONCILED"];
const RETURNED = ["RETURNED_FULL", "RETURNED_PARTIAL"];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "month";
    const shopFilter = url.searchParams.get("shop");
    const now = new Date();
    let from = startOfMonth(now), to = now;
    if (period === "last_month") { from = startOfMonth(subMonths(now, 1)); to = endOfMonth(subMonths(now, 1)); }
    else if (period === "quarter") { from = subMonths(startOfMonth(now), 2); }
    else if (period === "year") { from = new Date(now.getFullYear(), 0, 1); }

    const where: any = { createdTime: { gte: from, lte: to } };
    if (shopFilter) where.shopName = { contains: shopFilter, mode: "insensitive" };

    const orders = await prisma.order.findMany({
      where,
      select: { shopName: true, totalFee: true, carrierFee: true, codAmount: true, deliveryStatus: true },
    });

    const map: Record<string, any> = {};
    orders.forEach(o => {
      const s = o.shopName || "Không rõ";
      if (!map[s]) map[s] = { shop: s, total: 0, delivered: 0, returned: 0, revenue: 0, codTotal: 0, totalFee: 0 };
      map[s].total++;
      map[s].totalFee += o.totalFee || 0;
      if (DELIVERED_OK.includes(o.deliveryStatus)) map[s].delivered++;
      if (RETURNED.includes(o.deliveryStatus)) map[s].returned++;
      if (REVENUE_STATUSES.includes(o.deliveryStatus)) map[s].revenue += (o.totalFee || 0) - (o.carrierFee || 0);
      map[s].codTotal += o.codAmount || 0;
    });

    const shops = Object.values(map)
      .map((s: any) => ({
        ...s,
        deliveryRate: s.total > 0 ? Math.round((s.delivered / s.total) * 100) : 0,
        returnRate: s.total > 0 ? Math.round((s.returned / s.total) * 100) : 0,
        avgFee: s.total > 0 ? Math.round(s.totalFee / s.total) : 0,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue);

    return NextResponse.json({ shops });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
