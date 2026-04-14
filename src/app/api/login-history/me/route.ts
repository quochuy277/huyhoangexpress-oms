import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// GET — my login history
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const url = new URL(req.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
    const [year, mon] = month.split("-").map(Number);
    const from = new Date(year, mon - 1, 1);
    const to = new Date(year, mon, 0, 23, 59, 59);

    const [records, total] = await Promise.all([
      prisma.loginHistory.findMany({
        where: { userId: session.user.id, loginTime: { gte: from, lte: to } },
        orderBy: { loginTime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.loginHistory.count({
        where: { userId: session.user.id, loginTime: { gte: from, lte: to } },
      }),
    ]);

    return NextResponse.json({
      records,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    logger.error("GET /api/login-history/me", "GET login-history/me error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
