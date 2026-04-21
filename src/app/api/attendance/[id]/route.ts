import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";
import { attendanceUpdateSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

// PUT — edit attendance (manager/admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const denied = requirePermission(session.user, "canEditAttendance", "Bạn không có quyền chỉnh sửa chấm công");
    if (denied) return denied;

    const callerRole = (session.user as { role?: string }).role;
    // Scope rule (Sprint 1 — 2026-04):
    // The current Prisma schema has no team/manager relation on User, so there
    // is no data-level way to say "this staff belongs to manager X". Business
    // rule is therefore: MANAGER and ADMIN may edit any attendance row
    // company-wide. Other roles holding `canEditAttendance` (e.g. a future
    // custom permission group) are blocked here to prevent IDOR.
    //
    // If we later add a team relation (e.g. User.managerId), tighten this to
    // `isAdmin || existing.user.managerId === session.user.id`.
    if (callerRole !== "ADMIN" && callerRole !== "MANAGER") {
      return NextResponse.json({ error: "Chỉ quản lý hoặc quản trị viên được chỉnh sửa chấm công" }, { status: 403 });
    }

    const { id } = await params;
    const parsed = attendanceUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { status, editNote } = parsed.data;

    // Verify record exists before updating (return 404 instead of silent failure,
    // and give us the attended user id for future scope rules).
    const existing = await prisma.attendance.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy bản ghi chấm công" }, { status: 404 });
    }

    await prisma.attendance.update({
      where: { id },
      data: {
        status,
        isManualEdit: true,
        editedBy: session.user.name || "Unknown",
        editNote: editNote || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("PUT /api/attendance/[id]", "PUT attendance error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
