import type { TodoStats, TodoStatsResponse } from "@/types/todo";

export type TodoScopeSelection = "mine" | "all" | `user:${string}`;

export function parseTodoScopeSelection(selection: string): {
  scope: "mine" | "all";
  assigneeId: string | null;
} {
  if (selection.startsWith("user:")) {
    const assigneeId = selection.slice(5).trim();
    if (assigneeId) {
      return { scope: "all", assigneeId };
    }
  }

  if (selection === "all") {
    return { scope: "all", assigneeId: null };
  }

  return { scope: "mine", assigneeId: null };
}

export function resolveTodoAssigneeFilter(
  scope: string,
  sessionUserId: string,
  assigneeId?: string | null,
) {
  if (scope === "mine") {
    return sessionUserId;
  }

  if (assigneeId?.trim()) {
    return assigneeId.trim();
  }

  return null;
}

export function getTodoStatsForSelection(
  stats: TodoStatsResponse | null,
  selection: string,
): TodoStats | null {
  if (!stats) {
    return null;
  }

  const parsed = parseTodoScopeSelection(selection);
  if (parsed.assigneeId) {
    return stats.selected ?? null;
  }

  return parsed.scope === "mine" ? stats.mine : stats.all;
}
