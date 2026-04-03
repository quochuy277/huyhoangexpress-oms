import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const denied = requirePermission(session.user, "canViewOrders", "Bạn không có quyền xem lịch sử upload");
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");

    const offset = (page - 1) * pageSize;

    const [total, histories] = await Promise.all([
      prisma.uploadHistory.count(),
      prisma.uploadHistory.findMany({
        skip: offset,
        take: pageSize,
        orderBy: { uploadedAt: "desc" },
        include: {
          uploadedBy: {
            select: { name: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      histories,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("GET /api/orders/upload-history error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải lịch sử upload" },
      { status: 500 }
    );
  }
}
