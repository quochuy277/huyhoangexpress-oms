import { prisma } from "@/lib/prisma";
import { canViewAllTodos } from "@/lib/todo-permissions";
import { countStatsForAssignee } from "@/lib/todo-stats";
import { getDayWindows, FOCUS_CAP } from "@/lib/todo-dates";
import type { PermissionSet } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import type { TodoBootstrapData } from "@/lib/todo-bootstrap-state";

type TodoPageUser = {
  id: string;
  role: Role | string;
  permissions?: Partial<PermissionSet> | null;
};

export async function getTodosBootstrapData(user: TodoPageUser): Promise<TodoBootstrapData> {
  const { todayStart, todayEnd, weekStart, weekEnd } = getDayWindows();
  const canViewAll = canViewAllTodos(user);

  const [focusTodos, mine, all, overdueItems, dueTodayItems, overdueTotal, dueTodayTotal, users] =
    await Promise.all([
      prisma.todoItem.findMany({
        where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { lt: todayEnd } },
        include: {
          assignee: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          linkedOrder: {
            select: { id: true, requestCode: true, shopName: true, status: true, codAmount: true },
          },
          _count: { select: { comments: true } },
        },
        orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
        take: FOCUS_CAP,
      }),
      countStatsForAssignee({ assigneeId: user.id, todayStart, todayEnd, weekStart, weekEnd }),
      canViewAll
        ? countStatsForAssignee({ assigneeId: null, todayStart, todayEnd, weekStart, weekEnd })
        : Promise.resolve(null),
      prisma.todoItem.findMany({
        where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { lt: todayStart } },
        select: { id: true, title: true, dueDate: true },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.todoItem.findMany({
        where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { gte: todayStart, lt: todayEnd } },
        select: { id: true, title: true },
        orderBy: { priority: "desc" },
        take: 5,
      }),
      prisma.todoItem.count({ where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { lt: todayStart } } }),
      prisma.todoItem.count({ where: { assigneeId: user.id, status: { not: "DONE" }, dueDate: { gte: todayStart, lt: todayEnd } } }),
      canViewAll
        ? prisma.user.findMany({ select: { id: true, name: true, role: true }, orderBy: { name: "asc" } })
        : Promise.resolve([]),
    ]);

  const todos = focusTodos.map((todo) => ({
    ...todo,
    dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
    completedAt: todo.completedAt ? todo.completedAt.toISOString() : null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
    linkedOrder: todo.linkedOrder
      ? {
          ...todo.linkedOrder,
          codAmount: todo.linkedOrder.codAmount != null ? Number(todo.linkedOrder.codAmount) : null,
        }
      : null,
  }));

  return {
    todos,
    pagination: { page: 1, pageSize: todos.length, total: todos.length, totalPages: 1 },
    stats: { mine, all: all ?? mine, selected: null },
    reminders: {
      overdue: {
        count: overdueTotal,
        items: overdueItems.map((item) => ({
          id: item.id,
          title: item.title,
          daysOverdue: Math.floor((todayStart.getTime() - new Date(item.dueDate!).getTime()) / 86400000),
        })),
      },
      dueToday: { count: dueTodayTotal, items: dueTodayItems },
    },
    users,
  };
}
