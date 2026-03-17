import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Reminder popup data (overdue + due today)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ overdue: { count: 0, items: [] }, dueToday: { count: 0, items: [] } });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const [overdueItems, dueTodayItems] = await Promise.all([
    prisma.todoItem.findMany({
      where: { assigneeId: session.user.id, status: { not: "DONE" }, dueDate: { lt: todayStart } },
      select: { id: true, title: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.todoItem.findMany({
      where: { assigneeId: session.user.id, status: { not: "DONE" }, dueDate: { gte: todayStart, lt: todayEnd } },
      select: { id: true, title: true },
      orderBy: { priority: "desc" },
      take: 5,
    }),
  ]);

  const [overdueTotal, dueTodayTotal] = await Promise.all([
    prisma.todoItem.count({ where: { assigneeId: session.user.id, status: { not: "DONE" }, dueDate: { lt: todayStart } } }),
    prisma.todoItem.count({ where: { assigneeId: session.user.id, status: { not: "DONE" }, dueDate: { gte: todayStart, lt: todayEnd } } }),
  ]);

  return NextResponse.json({
    overdue: {
      count: overdueTotal,
      items: overdueItems.map(item => ({
        id: item.id,
        title: item.title,
        daysOverdue: Math.floor((todayStart.getTime() - new Date(item.dueDate!).getTime()) / 86400000),
      })),
    },
    dueToday: {
      count: dueTodayTotal,
      items: dueTodayItems,
    },
  });
}
