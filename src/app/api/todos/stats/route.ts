import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Summary card data
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);

  const [todayCount, overdueCount, inProgressCount, doneWeekCount,
         todayCountAll, overdueCountAll, inProgressCountAll, doneWeekCountAll] = await Promise.all([
    // Mine
    prisma.todoItem.count({
      where: {
        assigneeId: userId, status: { not: "DONE" },
        OR: [
          { dueDate: { gte: todayStart, lt: todayEnd } },
          { createdAt: { gte: todayStart, lt: todayEnd } },
        ],
      },
    }),
    prisma.todoItem.count({
      where: { assigneeId: userId, status: { not: "DONE" }, dueDate: { lt: todayStart } },
    }),
    prisma.todoItem.count({
      where: { assigneeId: userId, status: "IN_PROGRESS" },
    }),
    prisma.todoItem.count({
      where: { assigneeId: userId, status: "DONE", completedAt: { gte: weekStart, lt: weekEnd } },
    }),
    // All
    prisma.todoItem.count({
      where: {
        status: { not: "DONE" },
        OR: [
          { dueDate: { gte: todayStart, lt: todayEnd } },
          { createdAt: { gte: todayStart, lt: todayEnd } },
        ],
      },
    }),
    prisma.todoItem.count({
      where: { status: { not: "DONE" }, dueDate: { lt: todayStart } },
    }),
    prisma.todoItem.count({ where: { status: "IN_PROGRESS" } }),
    prisma.todoItem.count({
      where: { status: "DONE", completedAt: { gte: weekStart, lt: weekEnd } },
    }),
  ]);

  return NextResponse.json({
    mine: { today: todayCount, overdue: overdueCount, inProgress: inProgressCount, doneWeek: doneWeekCount },
    all: { today: todayCountAll, overdue: overdueCountAll, inProgress: inProgressCountAll, doneWeek: doneWeekCountAll },
  });
}
