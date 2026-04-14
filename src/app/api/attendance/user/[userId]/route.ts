import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET — specific user's attendance (for manager detail view)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { userId } = await params;
    const url = new URL(req.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const [year, mon] = month.split("-").map(Number);
    // @db.Date stores UTC dates, use UTC ranges
    const from = new Date(Date.UTC(year, mon - 1, 1));
    const to = new Date(Date.UTC(year, mon, 0, 23, 59, 59));

    const [user, attendance, loginHistory] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } }),
      prisma.attendance.findMany({
        where: { userId, date: { gte: from, lte: to } },
        orderBy: { date: "asc" },
      }),
      prisma.loginHistory.findMany({
        where: { userId, loginTime: { gte: from, lte: to } },
        orderBy: { loginTime: "desc" },
        take: 100,
      }),
    ]);

    if (!user) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    return NextResponse.json({ user, attendance, loginHistory });
  } catch (error) {
    logger.error("GET /api/attendance/user/[userId]", "GET attendance/user error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
