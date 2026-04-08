import { useState, useCallback, useRef } from "react";
import type { TodoStatsResponse } from "@/types/todo";
import { shouldFetchTodoBootstrap } from "@/lib/todo-bootstrap-state";

export function useTodoStats(initialStats?: TodoStatsResponse | null) {
  const [stats, setStats] = useState<TodoStatsResponse | null>(initialStats ?? null);
  const [loading, setLoading] = useState(shouldFetchTodoBootstrap(initialStats ? { todos: [] } : null));
  const skipInitialFetchRef = useRef(Boolean(initialStats));

  const fetchStats = useCallback(async (assigneeId?: string | null) => {
    try {
      const params = new URLSearchParams();
      if (assigneeId) params.set("assigneeId", assigneeId);
      const res = await fetch(params.toString() ? `/api/todos/stats?${params}` : "/api/todos/stats");
      const data: TodoStatsResponse = await res.json();
      setStats(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, fetchStats, skipInitialFetchRef };
}
