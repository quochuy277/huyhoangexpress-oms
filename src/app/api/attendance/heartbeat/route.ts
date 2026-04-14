import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { closeOrphanedSessions, parseDeviceType, getVietnamToday, isAfterTime, calculateLateMinutes, getAttendanceSettings } from "@/lib/attendance";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();

    // Close any orphaned sessions first (stale heartbeat > 5 min)
    const closedCount = await closeOrphanedSessions(userId);

    // Find the most recent active session (logoutTime is null)
    let activeSession = await prisma.loginHistory.findFirst({
      where: { userId, logoutTime: null },
      orderBy: { loginTime: "desc" },
    });

    if (activeSession) {
      // Update heartbeat on existing active session
      await prisma.loginHistory.update({
        where: { id: activeSession.id },
        data: { lastHeartbeat: now },
      });
    } else {
      // No active session — check if this is because of a forced logout
      // before auto-creating a new session.
      const recentLogout = await prisma.loginHistory.findFirst({
        where: {
          userId,
          logoutReason: { in: ["admin_force_logout", "permission_group_changed", "permission_reassigned", "user_deactivated"] },
        },
        orderBy: { logoutTime: "desc" },
        select: { logoutTime: true },
      });
      if (recentLogout?.logoutTime) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (recentLogout.logoutTime > fiveMinutesAgo) {
          // Session was recently force-closed — do NOT recreate, signal logout
          return NextResponse.json({ ok: false, forceLogout: true });
        }
      }

      // No recent force-logout — auto-create session (user revisited with valid JWT)
      const userAgent = req.headers.get("user-agent") || "unknown";
      const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
      const deviceType = parseDeviceType(userAgent);

      activeSession = await prisma.loginHistory.create({
        data: {
          userId,
          loginTime: now,
          lastHeartbeat: now,
          ipAddress,
          userAgent,
          deviceType,
        },
      });

      // Auto check-in attendance for today (same logic as auth.ts login)
      try {
        const today = getVietnamToday();
        const settings = await getAttendanceSettings();
        const late = isAfterTime(now, settings.lateTime);
        const lateMins = calculateLateMinutes(now, settings.lateTime);

        await prisma.attendance.upsert({
          where: { userId_date: { userId, date: today } },
          create: {
            userId,
            date: today,
            firstLogin: now,
            isLate: late,
            lateMinutes: lateMins,
            status: "ABSENT", // Will be recalculated by next heartbeat cycle
          },
          update: {}, // Don't overwrite if already exists
        });
      } catch (err) {
        logger.warn("POST /api/attendance/heartbeat", "Attendance upsert failed", err instanceof Error ? err.message : String(err));
      }
    }

    return NextResponse.json({
      ok: true,
      closedCount,
      sessionCreated: !activeSession || closedCount > 0,
    });
  } catch (error) {
    logger.error("POST /api/attendance/heartbeat", "Heartbeat error", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
