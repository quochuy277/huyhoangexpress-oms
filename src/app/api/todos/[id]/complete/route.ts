import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readTodoVersion,
  todoConflictResponse,
  todoVersionRequiredResponse,
} from "@/lib/todo-optimistic-lock";
import { requireTodoAccess } from "@/lib/todo-permissions";

// PATCH - Toggle complete
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp" }, { status: 401 });
  }

  const { id } = await params;
  const access = await requireTodoAccess(session.user, id);
  if (access.error) return access.error;

  const { version } = await req.json();
  const todoVersion = readTodoVersion(version);
  if (todoVersion === null) {
    return todoVersionRequiredResponse();
  }

  const existing = await prisma.todoItem.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Kh\u00f4ng t\u00ecm th\u1ea5y" }, { status: 404 });
  }

  const isDone = existing.status === "DONE";
  const updated = await prisma.todoItem.updateMany({
    where: { id, version: todoVersion },
    data: {
      status: isDone ? "TODO" : "DONE",
      completedAt: isDone ? null : new Date(),
      version: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    return todoConflictResponse();
  }

  const todo = await prisma.todoItem.findUnique({ where: { id } });
  return NextResponse.json(todo);
}
