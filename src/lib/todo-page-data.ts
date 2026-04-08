import { prisma } from "@/lib/prisma";
import { canViewAllTodos } from "@/lib/todo-permissions";
import type { PermissionSet } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import type { TodoBootstrapData } from "@/lib/todo-bootstrap-state";

type TodoPageUser = {
  id: string;
  role: Role | string;
  permissions?: Partial<PermissionSet> | null;
};

async function countStatsForAssignee({
  assigneeId,
  todayStart,
  todayEnd,
  weekStart,
  weekEnd,
}: {
  assigneeId?: string | null;
  todayStart: Date;
  todayEnd: Date;
  weekStart: Date;
  weekEnd: Date;
}) {
  const assigneeWhere = assigneeId ? { assigneeId } : {};

  const [today, overdue, inProgress, doneWeek] = await Promise.all([
    prisma.todoItem.count({
      where: {
        ...assigneeWhere,
        status: { not: "DONE" },
        OR: [
          { dueDate: { gte: todayStart, lt: todayEnd } },
          { createdAt: { gte: todayStart, lt: todayEnd } },
        ],
      },
    }),
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: { not: "DONE" }, dueDate: { lt: todayStart } },
    }),
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: "IN_PROGRESS" },
    }),
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: "DONE", completedAt: { gte: weekStart, lt: weekEnd } },
    }),
  ]);

  return { today, overdue, inProgress, doneWeek };
}

export async function getTodosBootstrapData(user: TodoPageUser): Promise<TodoBootstrapData> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const canViewAll = canViewAllTodos(user);

  const [todos, total, mine, all, overdueItems, dueTodayItems, overdueTotal, dueTodayTotal, users] = await Promise.all([
    prisma.todoItem.findMany({
      where: { assigneeId: user.id },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        linkedOrder: {
          select: { id: true, requestCode: true, shopName: true, status: true, codAmount: true },
        },
        _count: { select: { comments: true } },
      },
      orderBy: [
        { status: "asc" },
        { priority: "desc" },
        { dueDate: { sort: "asc", nulls: "last" } },
        { sortOrder: "asc" },
      ],
      skip: 0,
      take: 20,
    }),
    prisma.todoItem.count({ where: { assigneeId: user.id } }),
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
      ? prisma.user.findMany({
          select: { id: true, name: true, role: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    todos: todos.map((todo) => ({
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
    })),
    pagination: {
      page: 1,
      pageSize: 20,
      total,
      totalPages: Math.ceil(total / 20),
    },
    stats: {
      mine,
      all: all ?? mine,
      selected: null,
    },
    reminders: {
      overdue: {
        count: overdueTotal,
        items: overdueItems.map((item) => ({
          id: item.id,
          title: item.title,
          daysOverdue: Math.floor((todayStart.getTime() - new Date(item.dueDate!).getTime()) / 86400000),
        })),
      },
      dueToday: {
        count: dueTodayTotal,
        items: dueTodayItems,
      },
    },
    users,
  };
}
