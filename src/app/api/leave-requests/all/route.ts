import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — all leave requests (manager/admin)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const requests = await prisma.leaveRequest.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: [{ leaveStatus: "asc" }, { createdAt: "desc" }],
    });

    const pendingCount = requests.filter(r => r.leaveStatus === "PENDING").length;

    return NextResponse.json({ requests, pendingCount });
  } catch (error) {
    console.error("GET leave-requests/all error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
