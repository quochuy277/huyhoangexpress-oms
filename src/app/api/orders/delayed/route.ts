import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import type { ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import { getDelayedPageData } from "@/lib/delayed-page-data";
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
      "Bạn không có quyền xem đơn hoãn",
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

    const data = await getDelayedPageData({
      page,
      pageSize,
      search,
      shopFilter,
      carrierFilter,
      riskFilter,
      reasonFilter,
      delayCountFilter,
      statusFilter,
      todayOnly,
      sortKey,
      sortDir,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching delayed orders:", error);
    return NextResponse.json(
      { success: false, error: "Không thể tải danh sách đơn hoãn" },
      { status: 500 },
    );
  }
}
