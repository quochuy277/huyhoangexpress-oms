import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_KEYS } from "@/lib/permissions";

// PATCH /api/admin/permission-groups/[id] — update group
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, ...permissionData } = body;

    const updateData: Record<string, any> = {};
    if (name !== undefined) {
      // Check uniqueness
      const existing = await prisma.permissionGroup.findFirst({
        where: { name: name.trim(), id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: "Tên nhóm quyền đã tồn tại" }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) updateData.description = description?.trim() || null;

    // Safe permission updates
    for (const key of PERMISSION_KEYS) {
      if (key in permissionData) {
        updateData[key] = !!permissionData[key];
      }
    }

    const group = await prisma.permissionGroup.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Update permission group error:", error);
    return NextResponse.json({ error: "Lỗi khi cập nhật nhóm quyền" }, { status: 500 });
  }
}

// DELETE /api/admin/permission-groups/[id] — delete group
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;

    const group = await prisma.permissionGroup.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!group) {
      return NextResponse.json({ error: "Nhóm quyền không tồn tại" }, { status: 404 });
    }

    if (group.isSystemGroup) {
      return NextResponse.json({ error: "Không thể xóa nhóm quyền hệ thống" }, { status: 400 });
    }

    if (group._count.users > 0) {
      return NextResponse.json({
        error: `Không thể xóa nhóm quyền đang có ${group._count.users} nhân viên. Vui lòng chuyển nhân viên sang nhóm khác trước.`,
      }, { status: 400 });
    }

    await prisma.permissionGroup.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete permission group error:", error);
    return NextResponse.json({ error: "Lỗi khi xóa nhóm quyền" }, { status: 500 });
  }
}
