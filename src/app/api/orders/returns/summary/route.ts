import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getReturnsSummaryData } from "@/lib/returns-page-data";
import { requirePermission } from "@/lib/route-permissions";

export async function GET() {
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

    return NextResponse.json({
      success: true,
      data: await getReturnsSummaryData(),
    });
  } catch (error) {
    console.error("GET /api/orders/returns/summary error:", error);
    return NextResponse.json(
      { error: "Không thể lấy thống kê đơn hoàn" },
      { status: 500 },
    );
  }
}
