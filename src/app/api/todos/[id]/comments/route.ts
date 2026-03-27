import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — List comments
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const comments = await prisma.todoComment.findMany({
    where: { todoItemId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ comments });
}

// POST — Add comment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Nội dung trống" }, { status: 400 });

  const comment = await prisma.todoComment.create({
    data: {
      todoItemId: id,
      content: content.trim(),
      authorName: session.user.name || "User",
      authorId: session.user.id,
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
