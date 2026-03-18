import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays, subWeeks, subMonths, startOfWeek, startOfMonth, format } from "date-fns";
import { requireFinanceAccess } from "@/lib/finance-auth";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const shopsParam = url.searchParams.get("shops") || "";
    const granularity = url.searchParams.get("granularity") || "day";
    const shopNames = shopsParam.split(",").filter(Boolean).slice(0, 8);

    if (shopNames.length === 0) return NextResponse.json({ chartData: [] });

    const now = new Date();
    let from: Date, bucketFn: (d: Date) => string;

    if (granularity === "week") {
      from = subWeeks(now, 12);
      bucketFn = (d: Date) => format(startOfWeek(d, { weekStartsOn: 1 }), "dd/MM");
    } else if (granularity === "month") {
      from = subMonths(now, 6);
      bucketFn = (d: Date) => format(startOfMonth(d), "MM/yyyy");
    } else {
      from = subDays(now, 30);
      bucketFn = (d: Date) => format(d, "dd/MM");
    }

    const orders = await prisma.order.findMany({
      where: { creatorShopName: { in: shopNames }, createdTime: { gte: from, lte: now } },
      select: { creatorShopName: true, createdTime: true },
    });

    const buckets: Record<string, Record<string, number>> = {};
    orders.forEach(o => {
      if (!o.createdTime) return;
      const bucket = bucketFn(o.createdTime);
      const shop = o.creatorShopName || "Khác";
      if (!buckets[bucket]) buckets[bucket] = {};
      buckets[bucket][shop] = (buckets[bucket][shop] || 0) + 1;
    });

    const chartData = Object.entries(buckets)
      .map(([period, shops]) => ({ period, ...shops }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return NextResponse.json({ chartData, shops: shopNames });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
