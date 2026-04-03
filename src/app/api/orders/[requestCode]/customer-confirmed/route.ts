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
    const { value } = await req.json();
    const staffName = session.user.name || session.user.email || "Nhân viên";

    await prisma.order.update({
      where: { requestCode },
      data: value
        ? {
            customerConfirmed: true,
            customerConfirmedBy: staffName,
            customerConfirmedAt: new Date(),
          }
        : {
            customerConfirmed: false,
            customerConfirmedBy: null,
            customerConfirmedAt: null,
          },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH customer-confirmed error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật" },
      { status: 500 }
    );
  }
}
