import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveTodoAssigneeFilter } from "@/lib/todo-scope";
import { canViewAllTodos } from "@/lib/todo-permissions";

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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const userId = session.user.id;
  const canViewAll = canViewAllTodos(session.user);
  const url = new URL(req.url);
  const assigneeId = url.searchParams.get("assigneeId") || "";
  const selectedAssigneeId = resolveTodoAssigneeFilter("all", userId, assigneeId, canViewAll);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  const mine = await countStatsForAssignee({
    assigneeId: userId,
    todayStart,
    todayEnd,
    weekStart,
    weekEnd,
  });

  if (!canViewAll) {
    return NextResponse.json({ mine, all: mine, selected: null });
  }

  const [all, selected] = await Promise.all([
    countStatsForAssignee({ assigneeId: null, todayStart, todayEnd, weekStart, weekEnd }),
    selectedAssigneeId
      ? countStatsForAssignee({
          assigneeId: selectedAssigneeId,
          todayStart,
          todayEnd,
          weekStart,
          weekEnd,
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ mine, all, selected });
}
