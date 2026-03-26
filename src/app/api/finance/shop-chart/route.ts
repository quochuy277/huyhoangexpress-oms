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
    let from: Date;
    let truncInterval: string;
    let bucketFn: (d: Date) => string;

    if (granularity === "week") {
      from = subWeeks(now, 12);
      truncInterval = "week";
      bucketFn = (d: Date) => format(startOfWeek(d, { weekStartsOn: 1 }), "dd/MM");
    } else if (granularity === "month") {
      from = subMonths(now, 6);
      truncInterval = "month";
      bucketFn = (d: Date) => format(startOfMonth(d), "MM/yyyy");
    } else {
      from = subDays(now, 30);
      truncInterval = "day";
      bucketFn = (d: Date) => format(d, "dd/MM");
    }

    // Use $queryRawUnsafe for DATE_TRUNC since the interval must be a SQL literal
    const rows = await prisma.$queryRawUnsafe<
      { period: Date; shop: string; count: bigint }[]
    >(
      `SELECT
        DATE_TRUNC($1, "createdTime") AS period,
        COALESCE("creatorShopName", 'Khác') AS shop,
        COUNT(*)::bigint AS count
      FROM "Order"
      WHERE "creatorShopName" = ANY($2::text[])
        AND "createdTime" >= $3
        AND "createdTime" <= $4
      GROUP BY period, shop
      ORDER BY period`,
      truncInterval,
      shopNames,
      from,
      now,
    );

    // Format period dates to match original display format
    const buckets: Record<string, Record<string, number>> = {};
    rows.forEach(row => {
      const bucket = bucketFn(new Date(row.period));
      const shop = row.shop;
      if (!buckets[bucket]) buckets[bucket] = {};
      buckets[bucket][shop] = Number(row.count);
    });

    const chartData = Object.entries(buckets)
      .map(([period, shops]) => ({ period, ...shops }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return NextResponse.json({ chartData, shops: shopNames });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
