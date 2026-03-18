import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE — Delete announcement (Admin only)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const user = session.user as { role: string };
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Không có quyền" }, { status: 403 });

  const { id } = await params;

  await prisma.announcement.delete({ where: { id } }).catch(() => null);

  return NextResponse.json({ success: true });
}
