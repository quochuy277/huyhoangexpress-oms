import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";
import { logger } from "@/lib/logger";

// GET — team attendance for a month (manager/admin)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const denied = requirePermission(session.user, "canViewAllAttendance", "Bạn không có quyền xem chấm công toàn công ty");
    if (denied) return denied;

    const url = new URL(req.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split("-").map(Number);
    const from = new Date(Date.UTC(year, mon - 1, 1));
    const to = new Date(Date.UTC(year, mon, 0, 23, 59, 59));

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, role: true,
        attendances: {
          where: { date: { gte: from, lte: to } },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const team = users.map(u => {
      const records = u.attendances;
      const present = records.filter(a => a.status === "PRESENT").length;
      const halfDay = records.filter(a => a.status === "HALF_DAY").length;
      const absent = records.filter(a => a.status === "ABSENT").length;
      const onLeave = records.filter(a => a.status === "ON_LEAVE").length;
      const lateCount = records.filter(a => a.isLate).length;
      const totalMinutes = records.reduce((s, a) => s + a.totalMinutes, 0);
      const workDays = present + halfDay;
      const avgHoursPerDay = workDays > 0 ? (totalMinutes / 60 / workDays) : 0;

      return {
        user: { id: u.id, name: u.name, role: u.role },
        stats: {
          present, halfDay, absent, onLeave, lateCount,
          totalMinutes, totalHours: Math.round(totalMinutes / 60 * 10) / 10,
          equivalent: present + halfDay * 0.5,
          avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
        },
      };
    });

    return NextResponse.json({ team, month });
  } catch (error) {
    logger.error("GET /api/attendance/team", "GET attendance/team error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
