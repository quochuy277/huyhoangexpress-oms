import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH — reject leave request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { rejectReason } = body;

    await prisma.leaveRequest.update({
      where: { id },
      data: {
        leaveStatus: "REJECTED",
        rejectedBy: session.user.name || "Unknown",
        rejectedAt: new Date(),
        rejectReason: rejectReason || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reject leave error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
