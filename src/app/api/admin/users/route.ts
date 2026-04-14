import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";

// GET /api/admin/users — list all users
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (!hasPermission(session.user, "canManageUsers")) {
      return NextResponse.json({ error: "Không có quyền quản lý nhân viên" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        dateOfBirth: true,
        hometown: true,
        permanentAddress: true,
        currentAddress: true,
        citizenId: true,
        phone: true,
        socialLink: true,
        role: true,
        department: true,
        position: true,
        isActive: true,
        createdAt: true,
        permissionGroup: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    logger.error("GET /api/admin/users", "List users error", error);
    return NextResponse.json({ error: "Lỗi khi lấy danh sách nhân viên" }, { status: 500 });
  }
}

// POST /api/admin/users — create new user
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (!hasPermission(session.user, "canManageUsers")) {
      return NextResponse.json({ error: "Không có quyền quản lý nhân viên" }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, name, dateOfBirth, hometown, permanentAddress, currentAddress, citizenId, phone, socialLink, permissionGroupId } = body;

    if (!email || !password || !name || !permissionGroupId) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Mật khẩu phải ít nhất 6 ký tự" }, { status: 400 });
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email đã tồn tại" }, { status: 400 });
    }

    // Get permission group to determine role
    const group = await prisma.permissionGroup.findUnique({ where: { id: permissionGroupId } });
    if (!group) {
      return NextResponse.json({ error: "Nhóm quyền không tồn tại" }, { status: 400 });
    }

    // Map group name to role for backward compat
    const roleMap: Record<string, string> = { "Admin": "ADMIN", "Quản lý": "MANAGER", "Xem": "VIEWER" };
    const role = roleMap[group.name] || "STAFF";

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role as any,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        hometown: hometown || null,
        permanentAddress: permanentAddress || null,
        currentAddress: currentAddress || null,
        citizenId: citizenId || null,
        phone: phone || null,
        socialLink: socialLink || null,
        permissionGroupId,
      },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    logger.error("POST /api/admin/users", "Create user error", error);
    return NextResponse.json({ error: "Lỗi khi tạo nhân viên" }, { status: 500 });
  }
}
