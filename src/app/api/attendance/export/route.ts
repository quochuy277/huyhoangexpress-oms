import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

// GET — export attendance as CSV (Excel-compatible)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const url = new URL(req.url);
    const month = url.searchParams.get("month") || format(new Date(), "yyyy-MM");
    const [year, mon] = month.split("-").map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 0, 23, 59, 59);

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const allAttendance = await prisma.attendance.findMany({
      where: { date: { gte: from, lte: to } },
    });

    // Build CSV with BOM for Excel
    const BOM = "\uFEFF";
    const headers = ["Nhân Viên", "Ngày Công", "Nửa Ngày", "Quy Đổi Công", "Vắng", "Nghỉ Phép", "Đi Muộn", "Tổng Giờ", "TB Giờ/Ngày"];
    const rows = users.map(u => {
      const records = allAttendance.filter(a => a.userId === u.id);
      const present = records.filter(a => a.status === "PRESENT").length;
      const halfDay = records.filter(a => a.status === "HALF_DAY").length;
      const absent = records.filter(a => a.status === "ABSENT").length;
      const onLeave = records.filter(a => a.status === "ON_LEAVE").length;
      const lateCount = records.filter(a => a.isLate).length;
      const totalMinutes = records.reduce((s, a) => s + a.totalMinutes, 0);
      const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
      const workDays = present + halfDay;
      const avgHoursPerDay = workDays > 0 ? Math.round((totalMinutes / 60 / workDays) * 10) / 10 : 0;
      const equivalent = present + halfDay * 0.5;

      return [u.name, present, halfDay, equivalent, absent, onLeave, lateCount, totalHours, avgHoursPerDay].join(",");
    });

    const csv = BOM + [headers.join(","), ...rows].join("\n");
    const filename = `chamcong_${month}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
