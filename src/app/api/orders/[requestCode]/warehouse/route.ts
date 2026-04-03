import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestCode: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const denied = requirePermission(session.user, "canConfirmReturn", "Bạn không có quyền thao tác");
    if (denied) return denied;

    const { requestCode } = await params;

    const updated = await prisma.order.updateMany({
      where: {
        requestCode,
        warehouseArrivalDate: null,
      },
      data: { warehouseArrivalDate: new Date() },
    });

    if (updated.count === 0) {
      const existingOrder = await prisma.order.findUnique({
        where: { requestCode },
        select: {
          requestCode: true,
          warehouseArrivalDate: true,
        },
      });

      if (!existingOrder) {
        return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });
      }

      if (existingOrder.warehouseArrivalDate) {
        return NextResponse.json(
          { error: "Đơn hàng đã được xác nhận về kho trước đó" },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: "Không thể cập nhật trạng thái kho" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH warehouse error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật" },
      { status: 500 }
    );
  }
}
