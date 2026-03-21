import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { closeOrphanedSessions } from "@/lib/attendance";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();

    // Update heartbeat on the most recent active session
    const activeSession = await prisma.loginHistory.findFirst({
      where: { userId, logoutTime: null },
      orderBy: { loginTime: "desc" },
    });

    if (activeSession) {
      await prisma.loginHistory.update({
        where: { id: activeSession.id },
        data: { lastHeartbeat: now },
      });
    }

    // Close any orphaned sessions (except current one)
    const closedCount = await closeOrphanedSessions(userId);

    return NextResponse.json({ ok: true, closedCount });
  } catch (error) {
    console.error("Heartbeat error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
