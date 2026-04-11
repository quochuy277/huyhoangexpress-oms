import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";

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

    const { id } = await params;
    const body = await req.json();
    const { status, editNote } = body;

    const validStatuses = ["PRESENT", "HALF_DAY", "ABSENT", "ON_LEAVE", "UNAPPROVED_LEAVE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
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
    console.error("PUT attendance error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
