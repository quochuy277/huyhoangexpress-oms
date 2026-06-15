import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { resolveTodoAssigneeFilter } from "@/lib/todo-scope";
import { canViewAllTodos } from "@/lib/todo-permissions";
import { getDayWindows } from "@/lib/todo-dates";
import { countStatsForAssignee } from "@/lib/todo-stats";

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

  const { todayStart, todayEnd, weekStart, weekEnd } = getDayWindows();

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
