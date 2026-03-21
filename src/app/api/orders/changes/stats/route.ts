import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const uploadHistoryId = searchParams.get("uploadHistoryId");

    if (!uploadHistoryId) {
      return NextResponse.json(
        { error: "Thiếu uploadHistoryId" },
        { status: 400 }
      );
    }

    // Count changes by type for the given upload batch
    const changesByType = await prisma.orderChangeLog.groupBy({
      by: ["changeType"],
      where: { uploadHistoryId },
      _count: { id: true },
    });

    // Get total
    const totalChanges = changesByType.reduce(
      (sum, item) => sum + item._count.id,
      0
    );

    // Build type → count map
    const byType: Record<string, number> = {};
    for (const item of changesByType) {
      byType[item.changeType] = item._count.id;
    }

    return NextResponse.json({
      totalChanges,
      byType,
    });
  } catch (error) {
    console.error("GET /api/orders/changes/stats error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải thống kê biến động" },
      { status: 500 }
    );
  }
}
