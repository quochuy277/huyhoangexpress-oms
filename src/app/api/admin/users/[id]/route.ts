import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";

// PATCH /api/admin/users/[id] — update user
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
    const body = await request.json();
    const { name, email, dateOfBirth, hometown, permanentAddress, currentAddress, citizenId, phone, socialLink, permissionGroupId, isActive } = body;

    // Check uniqueness if email changed
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: "Email đã tồn tại" }, { status: 400 });
      }
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (hometown !== undefined) updateData.hometown = hometown || null;
    if (permanentAddress !== undefined) updateData.permanentAddress = permanentAddress || null;
    if (currentAddress !== undefined) updateData.currentAddress = currentAddress || null;
    if (citizenId !== undefined) updateData.citizenId = citizenId || null;
    if (phone !== undefined) updateData.phone = phone || null;
    if (socialLink !== undefined) updateData.socialLink = socialLink || null;
    if (permissionGroupId !== undefined) updateData.permissionGroupId = permissionGroupId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true },
    });

    // Invalidate sessions when permission-related fields change
    if (permissionGroupId !== undefined || isActive !== undefined) {
      const now = new Date();
      await prisma.loginHistory.updateMany({
        where: { userId: id, logoutTime: null },
        data: { logoutTime: now, logoutReason: isActive === false ? "user_deactivated" : "permission_reassigned" },
      });
      await prisma.systemSetting.upsert({
        where: { key: "force_logout_at" },
        create: { key: "force_logout_at", value: now.toISOString() },
        update: { value: now.toISOString() },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    logger.error("PATCH /api/admin/users/[id]", "Update user error", error);
    return NextResponse.json({ error: "Lỗi khi cập nhật nhân viên" }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] — soft delete (deactivate)
export async function DELETE(
  _request: Request,
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

    // Prevent self-delete
    if (id === session.user.id) {
      return NextResponse.json({ error: "Không thể khóa tài khoản của chính mình" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate all active sessions for the deactivated user
    const now = new Date();
    await prisma.loginHistory.updateMany({
      where: { userId: id, logoutTime: null },
      data: { logoutTime: now, logoutReason: "user_deactivated" },
    });
    await prisma.systemSetting.upsert({
      where: { key: "force_logout_at" },
      create: { key: "force_logout_at", value: now.toISOString() },
      update: { value: now.toISOString() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/admin/users/[id]", "Delete user error", error);
    return NextResponse.json({ error: "Lỗi khi khóa tài khoản" }, { status: 500 });
  }
}
