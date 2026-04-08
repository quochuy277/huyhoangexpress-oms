import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getReturnsTabData } from "@/lib/returns-page-data";
import { requirePermission } from "@/lib/route-permissions";
import { type ReturnsTab } from "@/lib/returns-queries";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const denied = requirePermission(
      session.user,
      "canViewReturns",
      "Bạn không có quyền xem đơn hoàn",
    );
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const rawTab = searchParams.get("tab");
    const tab: ReturnsTab =
      rawTab === "full" || rawTab === "warehouse" ? rawTab : "partial";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
    const search = searchParams.get("search") || "";

    const orders = await getReturnsTabData({ tab, page, pageSize, search });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("GET /api/orders/returns error:", error);
    return NextResponse.json(
      { error: "Không thể lấy dữ liệu đơn hoàn" },
      { status: 500 },
    );
  }
}
