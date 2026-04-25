import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  readTodoVersion,
  todoConflictResponse,
  todoVersionRequiredResponse,
} from "@/lib/todo-optimistic-lock";
import { requireTodoAccess } from "@/lib/todo-permissions";
import { writeLimiter } from "@/lib/rate-limiter";

// PATCH - Quick status change
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp" }, { status: 401 });
  }

  const rateLimited = writeLimiter.check(`todo:${session.user.id}`);
  if (rateLimited) return rateLimited;

  const { id } = await params;
  const access = await requireTodoAccess(session.user, id);
  if (access.error) return access.error;

  const { status, version } = await req.json();
  const todoVersion = readTodoVersion(version);
  if (todoVersion === null) {
    return todoVersionRequiredResponse();
  }

  const validStatuses = ["TODO", "IN_PROGRESS", "DONE"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Tr\u1ea1ng th\u00e1i kh\u00f4ng h\u1ee3p l\u1ec7" },
      { status: 400 },
    );
  }

  const updated = await prisma.todoItem.updateMany({
    where: { id, version: todoVersion },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
      version: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    return todoConflictResponse();
  }

  const todo = await prisma.todoItem.findUnique({ where: { id } });
  return NextResponse.json(todo);
}
