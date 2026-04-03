import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { processDelayedOrder, type ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import {
  applyDelayedFilters,
  buildDelayedFacets,
  buildDelayedSummary,
  paginateDelayedOrders,
  sortDelayedOrders,
} from "@/lib/delayed-data";
import {
  buildDelayedOrdersWhere,
  DELAYED_ORDER_SELECT,
  DELAYED_SCAN_LIMIT,
  DELAYED_SCAN_WARNING,
} from "@/lib/delayed-query";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const denied = requirePermission(
      session.user,
      "canViewDelayed",
      "Bạn không có quyền xem đơn hoàn",
    );
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const search = searchParams.get("search") || "";
    const shopFilter = searchParams.get("shop") || "";
    const carrierFilter = searchParams.get("carrier") || "";
    const riskFilter = searchParams.get("risk") || "";
    const reasonFilter = searchParams.get("reason") || "";
    const delayCountFilter = searchParams.get("delay") || "";
    const statusFilter = searchParams.get("status") || "";
    const todayOnly = searchParams.get("today") === "1";
    const sortKey = (searchParams.get("sortKey") || "delayCount") as keyof ProcessedDelayedOrder;
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

    const rawOrders = await prisma.order.findMany({
      where: buildDelayedOrdersWhere({
        search,
        shopFilter,
        carrierFilter,
        statusFilter,
      }),
      select: DELAYED_ORDER_SELECT,
      orderBy: { lastUpdated: "desc" },
      take: DELAYED_SCAN_LIMIT + 1,
    });

    const isTruncated = rawOrders.length > DELAYED_SCAN_LIMIT;
    const candidateOrders = isTruncated ? rawOrders.slice(0, DELAYED_SCAN_LIMIT) : rawOrders;

    let processedOrders = candidateOrders.map((order) => processDelayedOrder(order));

    processedOrders = applyDelayedFilters(processedOrders, {
      search: "",
      shop: "",
      status: "",
      delay: delayCountFilter,
      reason: reasonFilter,
      risk: riskFilter || "all",
      today: todayOnly,
    });
    processedOrders = sortDelayedOrders(processedOrders, sortKey, sortDir);

    const summary = buildDelayedSummary(processedOrders);
    const facets = buildDelayedFacets(processedOrders);
    const { rows, pagination } = paginateDelayedOrders(processedOrders, page, pageSize);

    return NextResponse.json({
      success: true,
      data: {
        rows,
        summary,
        facets,
        pagination,
        meta: {
          isTruncated,
          scanLimit: DELAYED_SCAN_LIMIT,
          warning: isTruncated ? DELAYED_SCAN_WARNING : null,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching delayed orders:", error);
    return NextResponse.json(
      { success: false, error: "Không thể tải danh sách đơn hoàn" },
      { status: 500 },
    );
  }
}
