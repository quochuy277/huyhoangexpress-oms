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

    const orders = await prisma.order.findMany({
      where: { deliveryStatus: { in: COMPLETED }, createdTime: { gte: from, lte: to } },
      select: { carrierName: true, totalFee: true, carrierFee: true, revenue: true, codAmount: true, returnFee: true, deliveryStatus: true },
    });

    const map: Record<string, { carrier: string; orderCount: number; totalFee: number; carrierFee: number; revenue: number; negativeCount: number; returnFee: number; codTotal: number }> = {};
    orders.forEach(o => {
      const c = o.carrierName || "Khác";
      if (!map[c]) map[c] = { carrier: c, orderCount: 0, totalFee: 0, carrierFee: 0, revenue: 0, negativeCount: 0, returnFee: 0, codTotal: 0 };
      map[c].orderCount++;
      map[c].totalFee += Number(o.totalFee ?? 0);
      map[c].carrierFee += Number(o.carrierFee ?? 0);
      map[c].revenue += Number(o.revenue ?? 0);
      map[c].codTotal += Number(o.codAmount ?? 0);
      if (Number(o.revenue ?? 0) < 0) map[c].negativeCount++;
      if (o.deliveryStatus === "RETURNED_FULL" || o.deliveryStatus === "RETURNED_PARTIAL") map[c].returnFee += Number(o.returnFee ?? 0);
    });

    const carriers = Object.values(map)
      .map(c => ({ ...c, margin: c.totalFee > 0 ? Math.round((c.revenue / c.totalFee) * 1000) / 10 : 0 }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({ carriers });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
