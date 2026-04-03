import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const denied = requirePermission(session.user, "canEditStaffNotes", "Bạn không có quyền sửa ghi chú");
    if (denied) return denied;

    const { requestCode, staffNotes } = await req.json();

    if (!requestCode) {
      return NextResponse.json({ error: "Thiếu requestCode" }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { requestCode },
      data: { staffNotes },
    });

    return NextResponse.json({ success: true, staffNotes: order.staffNotes });
  } catch (error) {
    console.error("PATCH /api/orders/notes error:", error);
    return NextResponse.json(
      { error: "Không thể lưu ghi chú" },
      { status: 500 }
    );
  }
}
