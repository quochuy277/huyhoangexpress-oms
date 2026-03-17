import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT — Update link (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { id } = await params;
  const { title, url, description } = await req.json();
  if (!title || !url) return NextResponse.json({ error: "Thiếu tiêu đề hoặc URL" }, { status: 400 });

  const link = await prisma.importantLink.update({
    where: { id },
    data: { title, url, description: description || null },
  });
  return NextResponse.json({ link });
}

// DELETE — Delete link (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.importantLink.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
