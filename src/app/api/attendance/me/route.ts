import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — my attendance for a month
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const url = new URL(req.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split("-").map(Number);
    // @db.Date stores UTC dates, use UTC ranges
    const from = new Date(Date.UTC(year, mon - 1, 1));
    const to = new Date(Date.UTC(year, mon, 0, 23, 59, 59));

    const attendance = await prisma.attendance.findMany({
      where: { userId: session.user.id, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    });

    // Stats
    const present = attendance.filter(a => a.status === "PRESENT").length;
    const halfDay = attendance.filter(a => a.status === "HALF_DAY").length;
    const absent = attendance.filter(a => a.status === "ABSENT").length;
    const onLeave = attendance.filter(a => a.status === "ON_LEAVE").length;
    const lateCount = attendance.filter(a => a.isLate).length;
    const totalMinutes = attendance.reduce((s, a) => s + a.totalMinutes, 0);

    return NextResponse.json({
      attendance,
      stats: { present, halfDay, absent, onLeave, lateCount, totalMinutes, equivalent: present + halfDay * 0.5 },
    });
  } catch (error) {
    console.error("GET attendance/me error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
