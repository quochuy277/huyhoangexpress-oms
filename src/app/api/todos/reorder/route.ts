import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  TodoConflictError,
  readTodoVersion,
  todoConflictResponse,
  todoVersionRequiredResponse,
} from "@/lib/todo-optimistic-lock";
import { canViewAllTodos } from "@/lib/todo-permissions";

// PATCH - Batch reorder for Kanban drag
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp" }, { status: 401 });
  }

  const { items } = await req.json();
  if (!Array.isArray(items)) {
    return NextResponse.json(
      { error: "D\u1eef li\u1ec7u kh\u00f4ng h\u1ee3p l\u1ec7" },
      { status: 400 },
    );
  }

  for (const item of items) {
    if (readTodoVersion(item?.version) === null) {
      return todoVersionRequiredResponse();
    }
  }

  const validStatuses = ["TODO", "IN_PROGRESS", "DONE"];
  if (items.some((item) => item?.status && !validStatuses.includes(item.status))) {
    return NextResponse.json(
      { error: "Tr\u1ea1ng th\u00e1i kh\u00f4ng h\u1ee3p l\u1ec7" },
      { status: 400 },
    );
  }

  const canViewAll = canViewAllTodos(session.user);
  if (!canViewAll) {
    const itemIds = items.map((item: { id: string }) => item.id);
    const allowedCount = await prisma.todoItem.count({
      where: {
        id: { in: itemIds },
        assigneeId: session.user.id,
      },
    });

    if (allowedCount !== itemIds.length) {
      return NextResponse.json(
        { error: "Kh\u00f4ng c\u00f3 quy\u1ec1n thao t\u00e1c" },
        { status: 403 },
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of items as Array<{
        id: string;
        status?: string;
        sortOrder: number;
        version: number;
      }>) {
        const data: Record<string, unknown> = {
          sortOrder: item.sortOrder,
          version: { increment: 1 },
        };

        if (item.status) {
          data.status = item.status;
          data.completedAt = item.status === "DONE" ? new Date() : null;
        }

        const updated = await tx.todoItem.updateMany({
          where: {
            id: item.id,
            version: item.version,
          },
          data,
        });

        if (updated.count === 0) {
          throw new TodoConflictError();
        }
      }
    });
  } catch (error) {
    if (error instanceof TodoConflictError) {
      return todoConflictResponse();
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
