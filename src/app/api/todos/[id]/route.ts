import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readTodoVersion,
  todoConflictResponse,
  todoVersionRequiredResponse,
} from "@/lib/todo-optimistic-lock";
import { canViewAllTodos, requireTodoAccess } from "@/lib/todo-permissions";

const todoDetailInclude = {
  assignee: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  linkedOrder: {
    select: { id: true, requestCode: true, shopName: true, status: true, codAmount: true },
  },
  _count: { select: { comments: true } },
} as const;

// PUT - Update todo
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp" }, { status: 401 });
  }

  const { id } = await params;
  const access = await requireTodoAccess(session.user, id);
  if (access.error) return access.error;

  const body = await req.json();
  const { title, description, priority, dueDate, status, assigneeId, version } = body;
  const todoVersion = readTodoVersion(version);
  if (todoVersion === null) {
    return todoVersionRequiredResponse();
  }

  const canViewAll = canViewAllTodos(session.user);
  const data: Record<string, unknown> = {
    version: { increment: 1 },
  };

  if (title !== undefined) data.title = title.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (priority) data.priority = priority;
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (status) {
    data.status = status;
    data.completedAt = status === "DONE" ? new Date() : null;
  }
  if (assigneeId && canViewAll) data.assigneeId = assigneeId;

  const updated = await prisma.todoItem.updateMany({
    where: { id, version: todoVersion },
    data,
  });

  if (updated.count === 0) {
    return todoConflictResponse();
  }

  const todo = await prisma.todoItem.findUnique({
    where: { id },
    include: todoDetailInclude,
  });

  if (!todo) {
    return NextResponse.json({ error: "Kh\u00f4ng t\u00ecm th\u1ea5y" }, { status: 404 });
  }

  return NextResponse.json(todo);
}

// DELETE - Delete todo
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp" }, { status: 401 });
  }

  const { id } = await params;
  const access = await requireTodoAccess(session.user, id);
  if (access.error) return access.error;

  await prisma.todoItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// GET - Get single todo detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp" }, { status: 401 });
  }

  const { id } = await params;
  const access = await requireTodoAccess(session.user, id);
  if (access.error) return access.error;

  const todo = await prisma.todoItem.findUnique({
    where: { id },
    include: {
      assignee: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      linkedOrder: {
        select: { id: true, requestCode: true, shopName: true, status: true, codAmount: true },
      },
      comments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!todo) {
    return NextResponse.json({ error: "Kh\u00f4ng t\u00ecm th\u1ea5y" }, { status: 404 });
  }

  return NextResponse.json(todo);
}
