"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, ListTodo, Columns3 } from "lucide-react";

import { useTodos } from "@/hooks/useTodos";
import { useTodoStats } from "@/hooks/useTodoStats";
import { useTodoUsers } from "@/hooks/useTodoUsers";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { OrderDetailDialog } from "@/components/shared/OrderDetailDialog";
import { getTodoStatsForSelection, parseTodoScopeSelection, type TodoScopeSelection } from "@/lib/todo-scope";
import type { TodoItemData, TodoFilters as FiltersType } from "@/types/todo";

import { TodoQuickAdd } from "./TodoQuickAdd";
import { TodoFilters } from "./TodoFilters";
import { TodoSummaryCards } from "./TodoSummaryCards";
import { TodoReminderBanner } from "./TodoReminderBanner";
import { TodoListView } from "./TodoListView";
import { TodoKanbanView } from "./TodoKanbanView";
import { TodoDetailPanel } from "./TodoDetailPanel";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

export default function TodosClient({
  userId,
  userName,
  userRole,
}: {
  userId: string;
  userName: string;
  userRole: string;
}) {
  const [view, setView] = useState<"list" | "kanban">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("todoView") as "list" | "kanban") || "list";
    }
    return "list";
  });
  const [scopeSelection, setScopeSelection] = useState<TodoScopeSelection>("mine");
  const [hideDone, setHideDone] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FiltersType>({
    search: "",
    source: "",
    priority: "",
    dueFilter: "",
  });
  const [searchInput, setSearchInput] = useState("");
  const [selectedTodo, setSelectedTodo] = useState<TodoItemData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [orderDetailCode, setOrderDetailCode] = useState<string | null>(null);

  const { todos, loading, pagination, fetchTodos, toggleComplete, changeStatus, deleteTodo, quickAdd, reorderKanban, updateLocal } =
    useTodos();
  const { stats, fetchStats } = useTodoStats();

  const canViewAll = userRole === "ADMIN" || userRole === "MANAGER";
  const { users } = useTodoUsers(canViewAll);
  const { scope, assigneeId } = parseTodoScopeSelection(scopeSelection);
  const scopeStats = getTodoStatsForSelection(stats, scopeSelection);
  const deleteTarget = deleteId ? todos.find((todo) => todo.id === deleteId) : null;

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const doFetch = useCallback(() => {
    fetchTodos({ scope, assigneeId, filters, hideDone, page, pageSize: 20 });
  }, [fetchTodos, scope, assigneeId, filters, hideDone, page]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  useEffect(() => {
    fetchStats(assigneeId);
  }, [fetchStats, assigneeId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("todoView", view);
    }
  }, [view]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === "n" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setShowNewDialog(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleQuickAdd = async (title: string, priority: string) => {
    const ok = await quickAdd(title, priority);
    if (ok) {
      doFetch();
      fetchStats(assigneeId);
    }
    return ok;
  };

  const handleToggleComplete = async (id: string) => {
    await toggleComplete(id);
    fetchStats(assigneeId);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await changeStatus(id, status);
    fetchStats(assigneeId);
  };

  const handleDelete = async () => {
    if (!deleteId) {
      return;
    }

    await deleteTodo(deleteId);
    fetchStats(assigneeId);
    setDeleteId(null);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) {
      return;
    }

    const statusMap: Record<string, string> = {
      todo: "TODO",
      inprogress: "IN_PROGRESS",
      done: "DONE",
    };
    const newStatus = statusMap[result.destination.droppableId];
    await reorderKanban(result.draggableId, newStatus, result.destination.index);
    fetchStats(assigneeId);
  };

  const handleFilterChange = (nextFilters: FiltersType) => {
    setFilters(nextFilters);
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ search: "", source: "", priority: "", dueFilter: "" });
    setSearchInput("");
    setPage(1);
  };

  const handleNewDialogClose = () => {
    setShowNewDialog(false);
    doFetch();
    fetchStats(assigneeId);
  };

  const handleUpdateFromDetail = (updated: TodoItemData) => {
    updateLocal(updated);
    fetchStats(assigneeId);
  };

  const handleDeleteFromDetail = () => {
    doFetch();
    fetchStats(assigneeId);
  };

  return (
    <div className="flex h-full flex-col gap-3 sm:gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="m-0 text-lg font-bold text-slate-800 sm:text-xl">Công Việc</h1>
          <p className="mt-0.5 text-xs text-gray-500 sm:text-[13px]">Quản lý và theo dõi công việc</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canViewAll && (
            <select
              value={scopeSelection}
              onChange={(event) => {
                setScopeSelection(event.target.value as TodoScopeSelection);
                setPage(1);
              }}
              className="cursor-pointer rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-[13px] font-semibold outline-none transition-colors focus:border-blue-400"
            >
              <option value="mine">Của tôi</option>
              <option value="all">Tất cả</option>
              {users.map((user) => (
                <option key={user.id} value={`user:${user.id}`}>
                  {user.name || user.id}
                </option>
              ))}
            </select>
          )}

          <div className="flex overflow-hidden rounded-lg border-[1.5px] border-gray-200">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold transition-colors sm:px-3 sm:py-1.5 ${
                view === "list" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <ListTodo size={14} /> <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`flex items-center gap-1 border-l border-gray-200 px-3 py-2 text-xs font-semibold transition-colors sm:px-3 sm:py-1.5 ${
                view === "kanban" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Columns3 size={14} /> <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          <button
            onClick={() => setShowNewDialog(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 sm:px-4"
          >
            <Plus size={15} /> <span className="hidden sm:inline">Thêm mới</span>
          </button>
        </div>
      </div>

      <TodoReminderBanner
        onViewOverdue={() => {
          setFilters((current) => ({ ...current, dueFilter: "overdue" }));
          setPage(1);
        }}
      />

      <TodoQuickAdd onAdd={handleQuickAdd} />

      <TodoSummaryCards
        stats={scopeStats}
        onClickOverdue={() => {
          setFilters((current) => ({ ...current, dueFilter: "overdue" }));
          setPage(1);
        }}
      />

      <TodoFilters
        filters={filters}
        searchInput={searchInput}
        hideDone={hideDone}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={() => {
          setFilters((current) => ({ ...current, search: searchInput.trim() }));
          setPage(1);
        }}
        onFilterChange={handleFilterChange}
        onHideDoneChange={setHideDone}
        onReset={resetFilters}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center py-16 text-gray-500">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : view === "list" ? (
          <TodoListView
            todos={todos}
            pagination={pagination}
            onToggleComplete={handleToggleComplete}
            onStatusChange={handleStatusChange}
            onSelect={setSelectedTodo}
            onDelete={setDeleteId}
            onViewOrder={setOrderDetailCode}
            onPageChange={setPage}
          />
        ) : (
          <TodoKanbanView todos={todos} onDragEnd={handleDragEnd} onSelect={setSelectedTodo} />
        )}
      </div>

      {selectedTodo && (
        <TodoDetailPanel
          todo={selectedTodo}
          onClose={() => setSelectedTodo(null)}
          onUpdate={handleUpdateFromDetail}
          onDelete={handleDeleteFromDetail}
          userId={userId}
          userName={userName}
          userRole={userRole}
        />
      )}

      {deleteId && deleteTarget && (
        <DeleteConfirmDialog
          title={deleteTarget.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <OrderDetailDialog
        requestCode={orderDetailCode}
        open={Boolean(orderDetailCode)}
        onClose={() => setOrderDetailCode(null)}
        userRole={userRole}
      />

      <AddTodoDialog
        open={showNewDialog}
        onClose={handleNewDialogClose}
        defaultTitle=""
        defaultDescription=""
        defaultPriority="MEDIUM"
        source="MANUAL"
        userRole={userRole}
      />
    </div>
  );
}
