import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

import type { PermissionSet } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/route-permissions";

type TodoUser = {
  id?: string | null;
  role?: Role | string | null;
  permissions?: Partial<PermissionSet> | null;
} | null | undefined;

export function canViewAllTodos(user: TodoUser) {
  return hasPermission(user, "canViewAllTodos");
}

export async function requireTodoAccess(user: TodoUser, todoId: string) {
  if (!user?.id) {
    return {
      todo: null,
      error: NextResponse.json({ error: "Ch\u01b0a \u0111\u0103ng nh\u1eadp" }, { status: 401 }),
    };
  }

  const todo = await prisma.todoItem.findUnique({
    where: { id: todoId },
    select: { id: true, assigneeId: true },
  });

  if (!todo) {
    return {
      todo: null,
      error: NextResponse.json({ error: "Kh\u00f4ng t\u00ecm th\u1ea5y" }, { status: 404 }),
    };
  }

  if (!canViewAllTodos(user) && todo.assigneeId !== user.id) {
    return {
      todo: null,
      error: NextResponse.json(
        { error: "Kh\u00f4ng c\u00f3 quy\u1ec1n thao t\u00e1c" },
        { status: 403 },
      ),
    };
  }

  return { todo, error: null };
}
