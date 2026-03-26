import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DeliveryStatus } from "@prisma/client";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { parsePeriodFromURL } from "@/lib/finance-period";

const COMPLETED: DeliveryStatus[] = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL", "DELIVERED"] as DeliveryStatus[];

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const range = parsePeriodFromURL(url);
    const from = range.from, to = range.to;

    const whereBase = { deliveryStatus: { in: COMPLETED }, createdTime: { gte: from, lte: to } };

    // Run all three groupBy queries in parallel
    const [mainGroups, negativeGroups, returnGroups] = await Promise.all([
      // Main aggregation: sums + count per carrier
      prisma.order.groupBy({
        by: ["carrierName"],
        where: whereBase,
        _sum: { totalFee: true, carrierFee: true, revenue: true, codAmount: true },
        _count: true,
      }),
      // Negative revenue count per carrier
      prisma.order.groupBy({
        by: ["carrierName"],
        where: { ...whereBase, revenue: { lt: 0 } },
        _count: true,
      }),
      // Return fee sum per carrier (only returned statuses)
      prisma.order.groupBy({
        by: ["carrierName"],
        where: { deliveryStatus: { in: ["RETURNED_FULL", "RETURNED_PARTIAL"] as DeliveryStatus[] }, createdTime: { gte: from, lte: to } },
        _sum: { returnFee: true },
      }),
    ]);

    const negativeMap = new Map(negativeGroups.map(g => [g.carrierName ?? "Khác", g._count]));
    const returnFeeMap = new Map(returnGroups.map(g => [g.carrierName ?? "Khác", Number(g._sum.returnFee ?? 0)]));

    const carriers = mainGroups
      .map(g => {
        const carrier = g.carrierName ?? "Khác";
        const totalFee = Number(g._sum.totalFee ?? 0);
        const carrierFee = Number(g._sum.carrierFee ?? 0);
        const revenue = Number(g._sum.revenue ?? 0);
        const codTotal = Number(g._sum.codAmount ?? 0);
        const orderCount = g._count;
        const negativeCount = negativeMap.get(carrier) ?? 0;
        const returnFee = returnFeeMap.get(carrier) ?? 0;
        const margin = totalFee > 0 ? Math.round((revenue / totalFee) * 1000) / 10 : 0;
        return { carrier, orderCount, totalFee, carrierFee, revenue, negativeCount, returnFee, codTotal, margin };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ carriers });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
