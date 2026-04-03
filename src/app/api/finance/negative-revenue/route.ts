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
    const rawPage = url.searchParams.get("page");
    const rawPageSize = url.searchParams.get("pageSize");
    const includeOrders = url.searchParams.get("includeOrders") === "1";
    const shouldLoadOrders = includeOrders || rawPage !== null || rawPageSize !== null;
    const page = Math.max(1, parseInt(rawPage || "1", 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(rawPageSize || "50", 10)));

    const negWhere = { revenue: { lt: 0 } as const, createdTime: { gte: from, lte: to } };

    const [lossAgg, carrierGroups, statusGroups, orders] = await Promise.all([
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
      prisma.order.groupBy({
        by: ["deliveryStatus"],
        where: negWhere,
        _count: true,
      }),
      shouldLoadOrders
        ? prisma.order.findMany({
            where: negWhere,
            select: {
              requestCode: true,
              carrierName: true,
              shopName: true,
              creatorShopName: true,
              status: true,
              deliveryStatus: true,
              totalFee: true,
              carrierFee: true,
              revenue: true,
              codAmount: true,
              regionGroup: true,
            },
            orderBy: { revenue: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
          })
        : Promise.resolve([]),
    ]);

    const totalLoss = Number(lossAgg._sum.revenue ?? 0);

    // Most frequent carrier from groupBy (sort by count descending)
    const sortedCarriers = [...carrierGroups].sort((a, b) => b._count - a._count);
    const topCarrier = sortedCarriers.length > 0 ? (sortedCarriers[0].carrierName ?? "Khác") : "—";

    // Most common reason
    const returnStatuses = new Set(["RETURNED_FULL", "RETURNED_PARTIAL"]);
    const returnCount = statusGroups.reduce((sum, group) => (
      returnStatuses.has(group.deliveryStatus) ? sum + group._count : sum
    ), 0);
    const feeOverCount = Math.max(0, lossAgg._count - returnCount);
    const topReason = returnCount >= feeOverCount ? "Đơn hoàn" : "Phí vượt";

    return NextResponse.json({
      summary: { totalOrders: lossAgg._count, totalLoss, topCarrier, topReason },
      orders,
      pagination: shouldLoadOrders
        ? {
            page,
            pageSize,
            total: lossAgg._count,
            totalPages: Math.max(1, Math.ceil(lossAgg._count / pageSize)),
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
