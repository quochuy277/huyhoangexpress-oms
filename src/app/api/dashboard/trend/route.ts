import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import type { DeliveryStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const denied = requirePermission(session.user, "canViewDashboard", "Không có quyền xem tổng quan");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "7", 10);
  
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, days - 1));

  // 1. Order Trend — SQL GROUP BY instead of fetching all records
  const currentMonthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const [trendRows, statusCounts] = await Promise.all([
    prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE("createdTime") as date, COUNT(*)::bigint as count
      FROM "Order"
      WHERE "createdTime" >= ${startDate} AND "createdTime" <= ${endDate}
      GROUP BY DATE("createdTime")
      ORDER BY date ASC
    `,
    // 2. Status Distribution
    prisma.order.groupBy({
      by: ['deliveryStatus'],
      _count: { id: true },
      where: { createdTime: { gte: currentMonthStart } },
    }),
  ]);

  // Build trend map with zero-filled days
  const trendMap: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    trendMap[format(subDays(new Date(), i), "dd/MM")] = 0;
  }
  trendRows.forEach(row => {
    const dateKey = format(new Date(row.date), "dd/MM");
    if (trendMap[dateKey] !== undefined) {
      trendMap[dateKey] = Number(row.count);
    }
  });

  const orderTrend = Object.entries(trendMap).map(([date, count]) => ({ date, count }));

  const statuses: Partial<Record<DeliveryStatus, { label: string, group: string }>> = {
    "IN_TRANSIT": { label: "Đang chuyển kho", group: "Active" },
    "DELIVERING": { label: "Đang giao", group: "Active" },
    "DELIVERED": { label: "Đã giao hàng", group: "Completed" },
    "RECONCILED": { label: "Đã đối soát", group: "Completed" },
    "DELIVERY_DELAYED": { label: "Hoãn giao hàng", group: "Problem" },
    "RETURN_CONFIRMED": { label: "Xác nhận hoàn", group: "Problem" },
    "RETURNING_FULL": { label: "Đang chuyển kho trả", group: "Returning" },
    "RETURN_DELAYED": { label: "Hoãn trả hàng", group: "Returning" },
    "RETURNED_FULL": { label: "Đã trả toàn bộ", group: "Returned" },
    "RETURNED_PARTIAL": { label: "Đã trả 1 phần", group: "Returned" }
  };

  const statusDistribution = statusCounts.map(st => ({
    status: st.deliveryStatus,
    label: statuses[st.deliveryStatus]?.label || st.deliveryStatus,
    count: st._count.id,
    group: statuses[st.deliveryStatus]?.group || "Other"
  })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    orderTrend,
    statusDistribution
  }, {
    headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" },
  });
}
