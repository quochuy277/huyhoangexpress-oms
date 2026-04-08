import { useState, useCallback, useRef } from "react";

import type { TodoFilters, TodoItemData, TodoPagination } from "@/types/todo";
import { shouldFetchTodoBootstrap } from "@/lib/todo-bootstrap-state";

interface UseTodosOptions {
  scope: "mine" | "all";
  assigneeId?: string | null;
  filters: TodoFilters;
  hideDone: boolean;
  page: number;
  pageSize: number;
}

async function readErrorMessage(response: Response) {
  const payload = await response.json().catch(() => null);
  if (payload && typeof payload.error === "string") {
    return payload.error;
  }
  return "Có lỗi xảy ra. Vui lòng thử lại.";
}

export function useTodos(initialData?: { todos?: TodoItemData[]; pagination?: TodoPagination } | null) {
  const [todos, setTodos] = useState<TodoItemData[]>(() => initialData?.todos || []);
  const [loading, setLoading] = useState(() =>
    shouldFetchTodoBootstrap(initialData ? { todos: initialData.todos || [] } : null),
  );
  const [pagination, setPagination] = useState<TodoPagination>(() => initialData?.pagination || {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const skipInitialFetchRef = useRef(
    !shouldFetchTodoBootstrap(initialData ? { todos: initialData.todos || [] } : null),
  );

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
      setPagination((current) => ({ ...current, ...data.pagination }));
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleComplete = useCallback(async (todo: TodoItemData) => {
    let previousTodos: TodoItemData[] = [];
    setTodos((prev) => {
      previousTodos = prev;
      return prev.map((item) => {
        if (item.id !== todo.id) return item;
        const nextStatus = item.status === "DONE" ? "TODO" : "DONE";
        return {
          ...item,
          status: nextStatus,
          completedAt: nextStatus === "DONE" ? new Date().toISOString() : null,
          version: item.version + 1,
        };
      });
    });

    try {
      const response = await fetch(`/api/todos/${todo.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: todo.version }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const updated = await response.json();
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? { ...item, ...updated } : item)));
    } catch {
      setTodos(previousTodos);
    }
  }, []);

  const changeStatus = useCallback(async (todo: TodoItemData, status: string) => {
    let previousTodos: TodoItemData[] = [];
    setTodos((prev) => {
      previousTodos = prev;
      return prev.map((item) => {
        if (item.id !== todo.id) return item;
        return {
          ...item,
          status: status as TodoItemData["status"],
          completedAt: status === "DONE" ? new Date().toISOString() : null,
          version: item.version + 1,
        };
      });
    });

    try {
      const response = await fetch(`/api/todos/${todo.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, version: todo.version }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const updated = await response.json();
      setTodos((prev) => prev.map((item) => (item.id === todo.id ? { ...item, ...updated } : item)));
    } catch {
      setTodos(previousTodos);
    }
  }, []);

  const deleteTodo = useCallback(async (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
    try {
      await fetch(`/api/todos/${id}`, { method: "DELETE" });
    } catch {
      // UI will resync on the next fetch
    }
  }, []);

  const quickAdd = useCallback(async (title: string, priority: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), priority }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const reorderKanban = useCallback(async (todo: TodoItemData, newStatus: string, newIndex: number) => {
    let previousTodos: TodoItemData[] = [];
    setTodos((prev) => {
      previousTodos = prev;
      return prev.map((item) =>
        item.id === todo.id
          ? {
              ...item,
              status: newStatus as TodoItemData["status"],
              completedAt: newStatus === "DONE" ? new Date().toISOString() : null,
              sortOrder: newIndex,
              version: item.version + 1,
            }
          : item,
      );
    });

    try {
      const response = await fetch("/api/todos/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ id: todo.id, status: newStatus, sortOrder: newIndex, version: todo.version }],
        }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
    } catch {
      setTodos(previousTodos);
    }
  }, []);

  const updateLocal = useCallback((updated: TodoItemData) => {
    setTodos((prev) => prev.map((todo) => (todo.id === updated.id ? { ...todo, ...updated } : todo)));
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
    skipInitialFetchRef,
  };
}
