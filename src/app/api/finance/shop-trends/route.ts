import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const periodA_start = subDays(today, 14);
    const periodB_start = subDays(today, 28);
    const periodB_end = subDays(today, 15);

    // Get all orders in last 28 days grouped by shop
    const recentOrders = await prisma.order.findMany({
      where: { createdTime: { gte: periodB_start, lte: today } },
      select: { creatorShopName: true, createdTime: true },
    });

    // Also get first order date for each shop
    const shopFirstOrders = await prisma.order.groupBy({
      by: ["creatorShopName"],
      _min: { createdTime: true },
    });
    const firstOrderMap: Record<string, Date> = {};
    shopFirstOrders.forEach(s => {
      if (s.creatorShopName && s._min.createdTime) firstOrderMap[s.creatorShopName] = s._min.createdTime;
    });

    // Count by period
    const shopCounts: Record<string, { recent: number; previous: number }> = {};
    recentOrders.forEach(o => {
      const s = o.creatorShopName || "Không rõ";
      if (!shopCounts[s]) shopCounts[s] = { recent: 0, previous: 0 };
      if (!o.createdTime) return;
      const t = o.createdTime.getTime();
      if (t >= periodA_start.getTime()) shopCounts[s].recent++;
      else if (t <= periodB_end.getTime()) shopCounts[s].previous++;
    });

    const trends = Object.entries(shopCounts)
      .map(([shopName, counts]) => {
        const firstOrder = firstOrderMap[shopName];
        const isNew = firstOrder && (today.getTime() - firstOrder.getTime()) < 28 * 86400000;

        if (isNew) return { shopName, recentCount: counts.recent, previousCount: counts.previous, changePercent: 0, alertLevel: "new" as const, firstOrderDate: firstOrder };
        if (counts.previous < 5) return null; // Too few orders

        const changePercent = Math.round(((counts.recent - counts.previous) / counts.previous) * 100);

        let alertLevel: "critical" | "warning" | "stable" | "growing" | "new";
        if (changePercent <= -50) alertLevel = "critical";
        else if (changePercent <= -30) alertLevel = "warning";
        else if (changePercent >= 10) alertLevel = "growing";
        else alertLevel = "stable";

        return { shopName, recentCount: counts.recent, previousCount: counts.previous, changePercent, alertLevel, firstOrderDate: firstOrder || null };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.changePercent - b.changePercent);

    return NextResponse.json({ trends });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
