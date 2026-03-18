import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH — Admin approve/reject a change request
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const user = session.user as { id: string; name?: string; role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const { id } = await params;
  const { action, reviewNote } = await req.json();

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });
  }

  const request = await prisma.infoChangeRequest.findUnique({ where: { id } });
  if (!request) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  // If approving, update the user's field
  if (action === "approve") {
    const updateData: Record<string, string> = {};
    updateData[request.fieldName] = request.newValue;
    await prisma.user.update({ where: { id: request.userId }, data: updateData });
  }

  await prisma.infoChangeRequest.update({
    where: { id },
    data: {
      status: action === "approve" ? "APPROVED" : "REJECTED",
      reviewedBy: user.name || user.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote || null,
    },
  });

  return NextResponse.json({ success: true });
}
