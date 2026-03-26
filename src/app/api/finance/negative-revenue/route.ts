import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { parsePeriodFromURL } from "@/lib/finance-period";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const range = parsePeriodFromURL(url);
    const from = range.from, to = range.to;

    const negWhere = { revenue: { lt: 0 } as const, createdTime: { gte: from, lte: to } };

    // Run aggregate, groupBy, and order list in parallel
    const [lossAgg, carrierGroups, orders] = await Promise.all([
      prisma.order.aggregate({
        where: negWhere,
        _sum: { revenue: true },
        _count: true,
      }),
      prisma.order.groupBy({
        by: ["carrierName"],
        where: negWhere,
        _count: true,
      }),
      prisma.order.findMany({
        where: negWhere,
        select: {
          requestCode: true, carrierName: true, creatorShopName: true, status: true, deliveryStatus: true,
          totalFee: true, carrierFee: true, revenue: true, codAmount: true, regionGroup: true,
        },
        orderBy: { revenue: "asc" },
      }),
    ]);

    const totalLoss = Number(lossAgg._sum.revenue ?? 0);

    // Most frequent carrier from groupBy (sort by count descending)
    const sortedCarriers = [...carrierGroups].sort((a, b) => b._count - a._count);
    const topCarrier = sortedCarriers.length > 0 ? (sortedCarriers[0].carrierName ?? "Khác") : "—";

    // Most common reason
    const returnCount = orders.filter(o => o.deliveryStatus === "RETURNED_FULL" || o.deliveryStatus === "RETURNED_PARTIAL").length;
    const feeOverCount = orders.length - returnCount;
    const topReason = returnCount >= feeOverCount ? "Đơn hoàn" : "Phí vượt";

    return NextResponse.json({
      summary: { totalOrders: lossAgg._count, totalLoss, topCarrier, topReason },
      orders,
    });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
