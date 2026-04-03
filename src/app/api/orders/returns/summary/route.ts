import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";
import { buildReturnsTabWhere } from "@/lib/returns-queries";

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

    const [partial, full, warehouse] = await Promise.all([
      prisma.order.count({ where: buildReturnsTabWhere("partial") }),
      prisma.order.count({ where: buildReturnsTabWhere("full") }),
      prisma.order.count({ where: buildReturnsTabWhere("warehouse") }),
    ]);

    return NextResponse.json({
      success: true,
      data: { partial, full, warehouse },
    });
  } catch (error) {
    console.error("GET /api/orders/returns/summary error:", error);
    return NextResponse.json(
      { error: "Không thể lấy thống kê đơn hoàn" },
      { status: 500 },
    );
  }
}
