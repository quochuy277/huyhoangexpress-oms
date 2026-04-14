import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateAttendance, getVietnamToday } from "@/lib/attendance";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/force-logout
 * Body: { mode: "all" | "except_admin", userId?: string }
 * 
 * - mode "all": logout ALL active sessions
 * - mode "except_admin": logout all except the requesting admin
 * - userId: logout a specific user's sessions
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { permissionGroup: true },
    });

    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { mode, userId } = body as { mode?: string; userId?: string };
    const now = new Date();

    const whereClause: any = { logoutTime: null };

    if (userId) {
      // Force logout a specific user
      whereClause.userId = userId;
    } else if (mode === "except_admin") {
      // Logout all except the requesting admin
      whereClause.userId = { not: session.user.id };
    }
    // mode "all" — no additional filter, logout everyone

    // Find all active sessions matching criteria
    const activeSessions = await prisma.loginHistory.findMany({
      where: whereClause,
      select: { id: true, userId: true, loginTime: true, lastHeartbeat: true },
    });

    if (activeSessions.length === 0) {
      return NextResponse.json({ count: 0, message: "Không có phiên đăng nhập nào để đóng" });
    }

    // Bulk close all sessions
    await prisma.loginHistory.updateMany({
      where: { id: { in: activeSessions.map(s => s.id) } },
      data: {
        logoutTime: now,
        logoutReason: "admin_force_logout",
      },
    });

    // Calculate duration for each session and batch in a single transaction
    const durationUpdates = activeSessions.map(s => {
      const logoutRef = s.lastHeartbeat || now;
      const duration = Math.floor((logoutRef.getTime() - s.loginTime.getTime()) / 60000);
      return prisma.loginHistory.update({
        where: { id: s.id },
        data: { duration: Math.max(0, duration) },
      });
    });
    await prisma.$transaction(durationUpdates);

    // Recalculate attendance for affected users
    const affectedUserIds = [...new Set(activeSessions.map(s => s.userId))];
    const today = getVietnamToday();
    for (const uid of affectedUserIds) {
      try {
        await recalculateAttendance(uid, today);
      } catch (e) {
        logger.warn("POST /api/admin/force-logout", `Failed to recalculate attendance for ${uid}`, e);
      }
    }

    // Set a global flag so heartbeat clients know they've been force-logged out
    await prisma.systemSetting.upsert({
      where: { key: "force_logout_at" },
      create: { key: "force_logout_at", value: now.toISOString() },
      update: { value: now.toISOString() },
    });

    return NextResponse.json({
      count: activeSessions.length,
      affectedUsers: affectedUserIds.length,
      message: `Đã buộc đăng xuất ${activeSessions.length} phiên của ${affectedUserIds.length} người dùng`,
    });
  } catch (error) {
    logger.error("POST /api/admin/force-logout", "Error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
