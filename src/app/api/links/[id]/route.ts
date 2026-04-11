import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/route-permissions";

// PUT — Update link
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const denied = requirePermission(session.user, "canManageLinks", "Bạn không có quyền quản lý liên kết");
  if (denied) return denied;

  const { id } = await params;
  const { title, url, description } = await req.json();
  if (!title || !url) return NextResponse.json({ error: "Thiếu tiêu đề hoặc URL" }, { status: 400 });

  const link = await prisma.importantLink.update({
    where: { id },
    data: { title, url, description: description || null },
  });
  return NextResponse.json({ link });
}

// DELETE — Delete link
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const denied2 = requirePermission(session.user, "canManageLinks", "Bạn không có quyền quản lý liên kết");
  if (denied2) return denied2;

  const { id } = await params;
  await prisma.importantLink.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
