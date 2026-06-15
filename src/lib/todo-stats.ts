import { prisma } from "@/lib/prisma";

export async function countStatsForAssignee({
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

  const [dueToday, overdue, inProgress, doneWeek] = await Promise.all([
    prisma.todoItem.count({
      where: { ...assigneeWhere, status: { not: "DONE" }, dueDate: { gte: todayStart, lt: todayEnd } },
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

  return { dueToday, overdue, inProgress, doneWeek };
}
