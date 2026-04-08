import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ overdueCount: 0, announcementCount: 0 }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [overdueCount, totalAnnouncements, readAnnouncements] = await Promise.all([
    prisma.todoItem.count({
      where: {
        assigneeId: userId,
        status: { not: "DONE" },
        dueDate: { lt: todayStart },
      },
    }),
    prisma.announcement.count(),
    prisma.announcementRead.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    overdueCount,
    announcementCount: Math.max(0, totalAnnouncements - readAnnouncements),
  });
}
