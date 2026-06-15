import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDayWindows } from "@/lib/todo-dates";

// GET — Overdue count for bell badge
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });

  const { todayStart } = getDayWindows();

  const count = await prisma.todoItem.count({
    where: {
      assigneeId: session.user.id,
      status: { not: "DONE" },
      dueDate: { lt: todayStart },
    },
  });

  return NextResponse.json({ count });
}
