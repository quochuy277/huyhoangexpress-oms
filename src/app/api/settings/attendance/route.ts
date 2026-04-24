import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET — attendance settings (intentionally readable by any logged-in user).
// IdleLogoutProvider runs for every authenticated session and reads
// `idle_timeout` + `auto_logout` to drive the client-side idle watchdog.
// The settings list ("late_time", "full_day_hours", etc.) is non-sensitive
// display config, so we accept the small surface area in exchange for a
// single source of truth. PUT stays locked to ADMIN/MANAGER below.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const rows = await prisma.systemSetting.findMany({
      where: { key: { startsWith: "attendance_" } },
    });
    const settings: Record<string, string> = {};
    rows.forEach(r => { settings[r.key.replace("attendance_", "")] = r.value; });

    return NextResponse.json(settings, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    logger.error("GET /api/settings/attendance", "GET settings error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

// PUT — update settings (admin/manager only)
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "MANAGER") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }

    const body = await req.json();
    const validKeys = ["late_time", "auto_logout", "idle_timeout", "full_day_hours", "half_day_hours", "timezone"];

    const updates = Object.entries(body).filter(([k]) => validKeys.includes(k));
    const userName = session.user.name || "Unknown";

    await prisma.$transaction(
      updates.map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key: `attendance_${key}` },
          create: { key: `attendance_${key}`, value: String(value), updatedBy: userName },
          update: { value: String(value), updatedBy: userName },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("PUT /api/settings/attendance", "PUT settings error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
