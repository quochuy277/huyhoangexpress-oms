import { useState, useCallback } from "react";
import type { TodoItemData, TodoPagination, TodoFilters } from "@/types/todo";

interface UseTodosOptions {
  scope: "mine" | "all";
  assigneeId?: string | null;
  filters: TodoFilters;
  hideDone: boolean;
  page: number;
  pageSize: number;
}

export function useTodos() {
  const [todos, setTodos] = useState<TodoItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<TodoPagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchTodos = useCallback(async (opts: UseTodosOptions) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        scope: opts.scope,
        page: String(opts.page),
        pageSize: String(opts.pageSize),
        hideDone: String(opts.hideDone),
      });
      if (opts.assigneeId) params.set("assigneeId", opts.assigneeId);
      if (opts.filters.search) params.set("search", opts.filters.search);
      if (opts.filters.source) params.set("source", opts.filters.source);
      if (opts.filters.priority) params.set("priority", opts.filters.priority);
      if (opts.filters.dueFilter) params.set("dueFilter", opts.filters.dueFilter);

      const res = await fetch(`/api/todos?${params}`);
      const data = await res.json();
      setTodos(data.todos || []);
      setPagination((p) => ({ ...p, ...data.pagination }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimistic toggle complete
  const toggleComplete = useCallback(async (id: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const newStatus = t.status === "DONE" ? "TODO" : "DONE";
        return {
          ...t,
          status: newStatus,
          completedAt: newStatus === "DONE" ? new Date().toISOString() : null,
        };
      })
    );
    try {
      await fetch(`/api/todos/${id}/complete`, { method: "PATCH" });
    } catch {
      // revert will happen on next fetch
    }
  }, []);

  // Optimistic status change
  const changeStatus = useCallback(async (id: string, status: string) => {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          status: status as TodoItemData["status"],
          completedAt: status === "DONE" ? new Date().toISOString() : t.completedAt,
        };
      })
    );
    try {
      await fetch(`/api/todos/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      // revert will happen on next fetch
    }
  }, []);

  // Optimistic delete
  const deleteTodo = useCallback(async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`/api/todos/${id}`, { method: "DELETE" });
    } catch {
      // revert will happen on next fetch
    }
  }, []);

  // Quick add
  const quickAdd = useCallback(async (title: string, priority: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), priority }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  // Kanban drag reorder (optimistic)
  const reorderKanban = useCallback(async (draggableId: string, newStatus: string, newIndex: number) => {
    setTodos((prev) =>
      prev.map((t) =>
        t.id === draggableId
          ? { ...t, status: newStatus as TodoItemData["status"], completedAt: newStatus === "DONE" ? new Date().toISOString() : null }
          : t
      )
    );
    try {
      await fetch("/api/todos/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ id: draggableId, status: newStatus, sortOrder: newIndex }] }),
      });
    } catch {
      // revert will happen on next fetch
    }
  }, []);

  // Update a single todo in local state (from detail panel)
  const updateLocal = useCallback((updated: TodoItemData) => {
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
  }, []);

  return {
    todos,
    loading,
    pagination,
    setPagination,
    fetchTodos,
    toggleComplete,
    changeStatus,
    deleteTodo,
    quickAdd,
    reorderKanban,
    updateLocal,
  };
}
