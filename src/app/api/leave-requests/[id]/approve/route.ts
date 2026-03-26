import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH — approve leave request
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { id } = await params;
    const request = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

    await prisma.leaveRequest.update({
      where: { id },
      data: {
        leaveStatus: "APPROVED",
        approvedBy: session.user.name || "Unknown",
        approvedAt: new Date(),
      },
    });

    // Update attendance records for the leave dates to ON_LEAVE (batched)
    const from = new Date(request.dateFrom);
    const to = new Date(request.dateTo);
    const upserts = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      upserts.push(
        prisma.attendance.upsert({
          where: { userId_date: { userId: request.userId, date } },
          create: { userId: request.userId, date, status: "ON_LEAVE" },
          update: { status: "ON_LEAVE" },
        })
      );
    }
    await prisma.$transaction(upserts);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve leave error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
