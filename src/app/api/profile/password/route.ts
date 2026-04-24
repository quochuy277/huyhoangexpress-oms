import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { BCRYPT_COST } from "@/lib/auth-constants";
import { sensitiveWriteLimiter } from "@/lib/rate-limiter";

// PATCH — Change password (requires old password)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const rateLimited = sensitiveWriteLimiter.check(`password:${userId}`);
  if (rateLimited) return rateLimited;
  const { oldPassword, newPassword } = await req.json();

  if (!oldPassword || !newPassword) {
    return NextResponse.json({ error: "Vui lòng nhập đủ mật khẩu cũ và mới" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Mật khẩu mới phải ít nhất 6 ký tự" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  const isValid = await bcrypt.compare(oldPassword, user.password);
  if (!isValid) {
    return NextResponse.json({ error: "Mật khẩu cũ không đúng" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, BCRYPT_COST);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}
