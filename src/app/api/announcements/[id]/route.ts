import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// DELETE — Delete announcement (Admin only)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const user = session.user as { role: string };
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

    const { id } = await params;

    try {
      await prisma.announcement.delete({ where: { id } });
    } catch (deleteError: any) {
      // P2025 = record not found → idempotent, treat as success
      if (deleteError?.code === "P2025") {
        logger.warn("DELETE /api/announcements/" + id, "Record not found (already deleted)");
      } else {
        // All other Prisma/DB errors must propagate
        throw deleteError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("DELETE /api/announcements", "Error", error);
    return NextResponse.json({ error: "Không thể xóa thông báo" }, { status: 500 });
  }
}
