import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — own leave requests
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const requests = await prisma.leaveRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("GET leave-requests error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}

// POST — create leave request
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const body = await req.json();
    const { dateFrom, dateTo, reason } = body;

    if (!dateFrom || !dateTo || !reason) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    if (to < from) {
      return NextResponse.json({ error: "Ngày kết thúc phải sau ngày bắt đầu" }, { status: 400 });
    }

    const totalDays = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;

    const request = await prisma.leaveRequest.create({
      data: {
        userId: session.user.id,
        dateFrom: from,
        dateTo: to,
        totalDays,
        reason,
      },
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    console.error("POST leave-requests error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
