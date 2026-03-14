import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "ADMIN" && role !== "MANAGER") {
      return NextResponse.json(
        { error: "Bạn không có quyền xóa đơn hàng" },
        { status: 403 }
      );
    }

    const { requestCodes } = await req.json();

    if (!Array.isArray(requestCodes) || requestCodes.length === 0) {
      return NextResponse.json(
        { error: "Chưa cung cấp danh sách mã đơn cần xóa" },
        { status: 400 }
      );
    }

    // Delete related records first because of foreign keys
    await prisma.$transaction(async (tx) => {
      // Find order IDs associated with these requestCodes
      const orders = await tx.order.findMany({
        where: { requestCode: { in: requestCodes } },
        select: { id: true },
      });
      const orderIds = orders.map(o => o.id);

      if (orderIds.length > 0) {
        await tx.claimOrder.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await tx.returnTracking.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        
        await tx.order.deleteMany({
          where: { requestCode: { in: requestCodes } },
        });
      }
    });

    return NextResponse.json({ success: true, count: requestCodes.length });
  } catch (error) {
    console.error("DELETE /api/orders error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi xóa đơn hàng" },
      { status: 500 }
    );
  }
}
