import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { hasPermission } from "@/lib/route-permissions";
import { logger } from "@/lib/logger";

// GET /api/admin/permission-groups — list all groups
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (!hasPermission(session.user, "canManagePermissions")) {
      return NextResponse.json({ error: "Không có quyền quản lý nhóm quyền" }, { status: 403 });
    }

    const groups = await prisma.permissionGroup.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(groups);
  } catch (error) {
    logger.error("GET /api/admin/permission-groups", "List permission groups error", error);
    return NextResponse.json({ error: "Lỗi khi lấy danh sách nhóm quyền" }, { status: 500 });
  }
}

// POST /api/admin/permission-groups — create new group
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    if (!hasPermission(session.user, "canManagePermissions")) {
      return NextResponse.json({ error: "Không có quyền quản lý nhóm quyền" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, ...permissionData } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tên nhóm quyền không được để trống" }, { status: 400 });
    }

    // Check uniqueness
    const existing = await prisma.permissionGroup.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Tên nhóm quyền đã tồn tại" }, { status: 400 });
    }

    // Filter only valid permission keys
    const safePerms: Record<string, boolean> = {};
    for (const key of PERMISSION_KEYS) {
      if (key in permissionData) {
        safePerms[key] = !!permissionData[key];
      }
    }

    const group = await prisma.permissionGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ...safePerms,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    logger.error("POST /api/admin/permission-groups", "Create permission group error", error);
    return NextResponse.json({ error: "Lỗi khi tạo nhóm quyền" }, { status: 500 });
  }
}
