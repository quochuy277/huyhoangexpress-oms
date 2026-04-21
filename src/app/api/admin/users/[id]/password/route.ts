import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";
import { BCRYPT_COST } from "@/lib/auth-constants";

// PATCH /api/admin/users/[id]/password — change password
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (!hasPermission(session.user, "canManageUsers")) {
      return NextResponse.json({ error: "Không có quyền quản lý nhân viên" }, { status: 403 });
    }

    const { id } = await params;
    const { newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Mật khẩu mới phải ít nhất 6 ký tự" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_COST);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("PATCH /api/admin/users/[id]/password", "Change password error", error);
    return NextResponse.json({ error: "Lỗi khi đổi mật khẩu" }, { status: 500 });
  }
}
