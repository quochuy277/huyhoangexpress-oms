import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — team attendance for a month (manager/admin)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const url = new URL(req.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split("-").map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 0, 23, 59, 59);

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });

    const allAttendance = await prisma.attendance.findMany({
      where: { date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    });

    const team = users.map(u => {
      const records = allAttendance.filter(a => a.userId === u.id);
      const present = records.filter(a => a.status === "PRESENT").length;
      const halfDay = records.filter(a => a.status === "HALF_DAY").length;
      const absent = records.filter(a => a.status === "ABSENT").length;
      const onLeave = records.filter(a => a.status === "ON_LEAVE").length;
      const lateCount = records.filter(a => a.isLate).length;
      const totalMinutes = records.reduce((s, a) => s + a.totalMinutes, 0);
      const workDays = present + halfDay;
      const avgHoursPerDay = workDays > 0 ? (totalMinutes / 60 / workDays) : 0;

      return {
        user: u,
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
    console.error("GET attendance/team error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
