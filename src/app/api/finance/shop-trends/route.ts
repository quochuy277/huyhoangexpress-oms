import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";
import { requireFinanceAccess } from "@/lib/finance-auth";

interface ShopTrend {
  shopName: string;
  recentCount: number;
  previousCount: number;
  changePercent: number;
  alertLevel: "critical" | "warning" | "stable" | "growing" | "new";
  firstOrderDate: Date | null;
}

export async function GET() {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const periodA_start = subDays(today, 14);
    const periodB_start = subDays(today, 28);
    const periodB_end = subDays(today, 15);

    const recentOrders = await prisma.order.findMany({
      where: { createdTime: { gte: periodB_start, lte: today } },
      select: { creatorShopName: true, createdTime: true },
    });

    const shopFirstOrders = await prisma.order.groupBy({
      by: ["creatorShopName"],
      _min: { createdTime: true },
    });
    const firstOrderMap: Record<string, Date> = {};
    shopFirstOrders.forEach(s => {
      if (s.creatorShopName && s._min.createdTime) firstOrderMap[s.creatorShopName] = s._min.createdTime;
    });

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
      .map(([shopName, counts]): ShopTrend | null => {
        const firstOrder = firstOrderMap[shopName];
        const isNew = firstOrder && (today.getTime() - firstOrder.getTime()) < 28 * 86400000;

        if (isNew) return { shopName, recentCount: counts.recent, previousCount: counts.previous, changePercent: 0, alertLevel: "new", firstOrderDate: firstOrder };
        if (counts.previous < 5) return null;

        const changePercent = Math.round(((counts.recent - counts.previous) / counts.previous) * 100);

        let alertLevel: ShopTrend["alertLevel"];
        if (changePercent <= -50) alertLevel = "critical";
        else if (changePercent <= -30) alertLevel = "warning";
        else if (changePercent >= 10) alertLevel = "growing";
        else alertLevel = "stable";

        return { shopName, recentCount: counts.recent, previousCount: counts.previous, changePercent, alertLevel, firstOrderDate: firstOrder || null };
      })
      .filter((t): t is ShopTrend => t !== null)
      .sort((a, b) => a.changePercent - b.changePercent);

    return NextResponse.json({ trends });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
