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

    // Use two separate groupBy queries instead of loading all orders
    const [recentGroups, previousGroups, shopFirstOrders] = await Promise.all([
      prisma.order.groupBy({
        by: ["creatorShopName"],
        where: { createdTime: { gte: periodA_start, lte: today } },
        _count: true,
      }),
      prisma.order.groupBy({
        by: ["creatorShopName"],
        where: { createdTime: { gte: periodB_start, lte: periodB_end } },
        _count: true,
      }),
      prisma.order.groupBy({
        by: ["creatorShopName"],
        _min: { createdTime: true },
      }),
    ]);

    const firstOrderMap: Record<string, Date> = {};
    shopFirstOrders.forEach(s => {
      if (s.creatorShopName && s._min.createdTime) firstOrderMap[s.creatorShopName] = s._min.createdTime;
    });

    // Build combined shop counts from the two groupBy results
    const shopCounts: Record<string, { recent: number; previous: number }> = {};
    recentGroups.forEach(g => {
      const s = g.creatorShopName || "Không rõ";
      if (!shopCounts[s]) shopCounts[s] = { recent: 0, previous: 0 };
      shopCounts[s].recent = g._count;
    });
    previousGroups.forEach(g => {
      const s = g.creatorShopName || "Không rõ";
      if (!shopCounts[s]) shopCounts[s] = { recent: 0, previous: 0 };
      shopCounts[s].previous = g._count;
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
