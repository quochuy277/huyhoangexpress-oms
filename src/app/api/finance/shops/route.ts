import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { parsePeriodFromURL } from "@/lib/finance-period";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const shopFilter = url.searchParams.get("shop");
    const range = parsePeriodFromURL(url);
    const from = range.from, to = range.to;

    // Use raw SQL with conditional aggregation — no need to load all orders
    const shopFilterClause = shopFilter
      ? Prisma.sql`AND "shopName" ILIKE ${'%' + shopFilter + '%'}`
      : Prisma.empty;

    const shops = await prisma.$queryRaw<Array<{
      shop: string;
      total: bigint;
      delivered: bigint;
      returned: bigint;
      revenue: number;
      codTotal: number;
      totalFee: number;
    }>>`
      SELECT
        COALESCE("shopName", 'Không rõ') as shop,
        COUNT(*)::bigint as total,
        COUNT(*) FILTER (WHERE "deliveryStatus" IN ('DELIVERED','RECONCILED'))::bigint as delivered,
        COUNT(*) FILTER (WHERE "deliveryStatus" IN ('RETURNED_FULL','RETURNED_PARTIAL'))::bigint as returned,
        COALESCE(SUM(CASE WHEN "deliveryStatus" IN ('RECONCILED','RETURNED_FULL','RETURNED_PARTIAL') THEN "totalFee" - "carrierFee" ELSE 0 END), 0)::float8 as revenue,
        COALESCE(SUM("codAmount"), 0)::float8 as "codTotal",
        COALESCE(SUM("totalFee"), 0)::float8 as "totalFee"
      FROM "Order"
      WHERE "createdTime" >= ${from} AND "createdTime" <= ${to}
        ${shopFilterClause}
      GROUP BY "shopName"
      ORDER BY revenue DESC
    `;

    const result = shops.map(s => {
      const total = Number(s.total);
      const delivered = Number(s.delivered);
      const returned = Number(s.returned);
      return {
        shop: s.shop,
        total,
        delivered,
        returned,
        revenue: Number(s.revenue),
        codTotal: Number(s.codTotal),
        totalFee: Number(s.totalFee),
        deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
        returnRate: total > 0 ? Math.round((returned / total) * 100) : 0,
        avgFee: total > 0 ? Math.round(Number(s.totalFee) / total) : 0,
      };
    });

    return NextResponse.json({ shops: result });
  } catch (error) {
    console.error("Finance shops error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
