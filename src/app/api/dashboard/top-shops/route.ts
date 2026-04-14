import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";
import { createServerTiming } from "@/lib/server-timing";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const denied = requirePermission(session.user, "canViewDashboard", "Không có quyền xem tổng quan");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const timing = createServerTiming();
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, days - 1));

    const shopCounts = await timing.measure("db_groupBy", () => prisma.order.groupBy({
      by: ['shopName'],
      _count: {
        id: true,
      },
      where: {
        createdTime: {
          gte: startDate,
          lte: endDate,
        },
        shopName: {
          not: null
        }
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    }));

    const topShops = shopCounts.map(s => ({
      shopName: s.shopName || "Không rõ",
      count: s._count.id
    }));

    return NextResponse.json({ topShops }, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120", ...timing.headers() },
    });
  } catch (error) {
    logger.error("GET /api/dashboard/top-shops", "days=" + new URL(req.url).searchParams.get("days"), error);
    return NextResponse.json({ error: "Không thể tải top cửa hàng" }, { status: 500 });
  }
}
