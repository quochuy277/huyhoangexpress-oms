import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

// PUT — Rename document (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { id } = await params;
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Thiếu tên mới" }, { status: 400 });

  const doc = await prisma.document.update({
    where: { id },
    data: { name },
  });
  return NextResponse.json({ document: doc });
}

// DELETE — Delete document + file (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  // Delete file from disk
  try {
    const filePath = path.join(process.cwd(), "public", doc.filePath);
    await fs.unlink(filePath);
  } catch { /* file may already be gone */ }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
