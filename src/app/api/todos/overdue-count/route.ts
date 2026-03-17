import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — Overdue count for bell badge
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const count = await prisma.todoItem.count({
    where: {
      assigneeId: session.user.id,
      status: { not: "DONE" },
      dueDate: { lt: todayStart },
    },
  });

  return NextResponse.json({ count });
}
