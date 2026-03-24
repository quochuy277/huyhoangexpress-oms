import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import type { DeliveryStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "7", 10);
  
  const endDate = endOfDay(new Date());
  const startDate = startOfDay(subDays(endDate, days - 1));

  // 1. Order Trend (Group by day) - Require raw query for group by date in PG
  const ordersInPeriod = await prisma.order.findMany({
    where: {
      createdTime: {
        gte: startDate,
        lte: endDate,
      }
    },
    select: {
      createdTime: true,
      deliveryStatus: true,
    }
  });

  // Group by date text "dd/MM"
  const trendMap: Record<string, number> = {};
  
  // Initialize map to ensure days with 0 orders exist
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(new Date(), i);
    trendMap[format(d, "dd/MM")] = 0;
  }

  // Count orders
  ordersInPeriod.forEach(order => {
    if (order.createdTime) {
      const dateKey = format(order.createdTime, "dd/MM");
      if (trendMap[dateKey] !== undefined) {
        trendMap[dateKey]++;
      }
    }
  });

  const orderTrend = Object.entries(trendMap).map(([date, count]) => ({
    date,
    count
  }));

  // 2. Status Distribution (Use Month to match requirements or current period)
  const currentMonthStart = startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const statusCounts = await prisma.order.groupBy({
    by: ['deliveryStatus'],
    _count: {
      id: true,
    },
    where: {
      createdTime: { gte: currentMonthStart } // Specs said current month for Pie/Bar
    }
  });

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
