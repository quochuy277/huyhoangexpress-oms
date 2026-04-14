import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";
import { format } from "date-fns";
import { logger } from "@/lib/logger";
import { createServerTiming } from "@/lib/server-timing";

// GET — export attendance as CSV (Excel-compatible)
export async function GET(req: NextRequest) {
  const timing = createServerTiming();

  try {
    const session = await timing.measure("auth", () => auth());
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401, headers: timing.headers() });

    const denied = requirePermission(session.user, "canViewAllAttendance", "Bạn không có quyền xuất chấm công");
    if (denied) return denied;

    const url = new URL(req.url);
    const month = url.searchParams.get("month") || format(new Date(), "yyyy-MM");
    const [year, mon] = month.split("-").map(Number);
    const from = new Date(Date.UTC(year, mon - 1, 1));
    const to = new Date(Date.UTC(year, mon, 0, 23, 59, 59));

    const users = await timing.measure("db", () =>
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true, name: true,
          attendances: {
            where: { date: { gte: from, lte: to } },
          },
        },
        orderBy: { name: "asc" },
      }),
    );

    const csv = await timing.measure("transform", () => {
      const BOM = "\uFEFF";
      const headers = ["Nhân Viên", "Ngày Công", "Nửa Ngày", "Quy Đổi Công", "Vắng", "Nghỉ Phép", "Đi Muộn", "Tổng Giờ", "TB Giờ/Ngày"];
      const rows = users.map(u => {
        const records = u.attendances;
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

      return BOM + [headers.join(","), ...rows].join("\n");
    });
    const filename = `chamcong_${month}.csv`;
    const timingHeader = timing.headerValue();

    logger.info("GET /api/attendance/export", `Exported ${users.length} attendance rows`, {
      timing: timingHeader,
      month,
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Server-Timing": timingHeader,
      },
    });
  } catch (error) {
    logger.error("GET /api/attendance/export", "Export error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500, headers: timing.headers() });
  }
}
