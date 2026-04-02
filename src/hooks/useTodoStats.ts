import { useState, useCallback } from "react";
import type { TodoStatsResponse } from "@/types/todo";

export function useTodoStats() {
  const [stats, setStats] = useState<TodoStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

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

  return { stats, loading, fetchStats };
}
