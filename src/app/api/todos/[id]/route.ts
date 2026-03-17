import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT — Update todo
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { title, description, priority, dueDate, status, assigneeId } = body;

  const data: any = {};
  if (title !== undefined) data.title = title.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (priority) data.priority = priority;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (status) {
    data.status = status;
    if (status === "DONE") data.completedAt = new Date();
    else data.completedAt = null;
  }
  if (assigneeId) data.assigneeId = assigneeId;

  const todo = await prisma.todoItem.update({
    where: { id },
    data,
    include: {
      assignee: { select: { id: true, name: true } },
      linkedOrder: { select: { id: true, requestCode: true, shopName: true, status: true, codAmount: true } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json(todo);
}

// DELETE — Delete todo
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  await prisma.todoItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// GET — Get single todo detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const { id } = await params;
  const todo = await prisma.todoItem.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      linkedOrder: { select: { id: true, requestCode: true, shopName: true, status: true, codAmount: true } },
      comments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!todo) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json(todo);
}
