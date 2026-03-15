import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestCode: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const permissions = session.user.permissions;
    if (!permissions?.canConfirmReturn) {
      return NextResponse.json({ error: "Bạn không có quyền thao tác" }, { status: 403 });
    }

    const { requestCode } = await params;
    const { value } = await req.json();
    const staffName = session.user.name || session.user.email || "Nhân viên";

    await prisma.order.update({
      where: { requestCode },
      data: value
        ? {
            customerConfirmAsked: true,
            confirmedAskedBy: staffName,
            confirmedAskedAt: new Date(),
          }
        : {
            customerConfirmAsked: false,
            confirmedAskedBy: null,
            confirmedAskedAt: null,
          },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH confirm-asked error:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật" },
      { status: 500 }
    );
  }
}
