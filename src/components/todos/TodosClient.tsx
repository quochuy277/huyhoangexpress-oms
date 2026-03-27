"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, ListTodo, Columns3 } from "lucide-react";
import { useTodos } from "@/hooks/useTodos";
import { useTodoStats } from "@/hooks/useTodoStats";
import { useDebounce } from "@/hooks/useDebounce";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { OrderDetailDialog } from "@/components/shared/OrderDetailDialog";
import { TodoQuickAdd } from "./TodoQuickAdd";
import { TodoFilters } from "./TodoFilters";
import { TodoSummaryCards } from "./TodoSummaryCards";
import { TodoReminderBanner } from "./TodoReminderBanner";
import { TodoListView } from "./TodoListView";
import { TodoKanbanView } from "./TodoKanbanView";
import { TodoDetailPanel } from "./TodoDetailPanel";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import type { TodoItemData, TodoFilters as FiltersType } from "@/types/todo";

export default function TodosClient({ userId, userName, userRole }: { userId: string; userName: string; userRole: string }) {
  // View & scope
  const [view, setView] = useState<"list" | "kanban">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("todoView") as "list" | "kanban") || "list";
    return "list";
  });
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [hideDone, setHideDone] = useState(false);
  const [page, setPage] = useState(1);

  // Filters with debounce
  const [filters, setFilters] = useState<FiltersType>({ search: "", source: "", priority: "", dueFilter: "" });
  const debouncedSearch = useDebounce(filters.search, 400);

  // Hooks
  const { todos, loading, pagination, fetchTodos, toggleComplete, changeStatus, deleteTodo, quickAdd, reorderKanban, updateLocal } = useTodos();
  const { stats, fetchStats } = useTodoStats();

  // UI state
  const [selectedTodo, setSelectedTodo] = useState<TodoItemData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [orderDetailCode, setOrderDetailCode] = useState<string | null>(null);

  const canViewAll = userRole === "ADMIN" || userRole === "MANAGER";
  const scopeStats = stats ? (scope === "mine" ? stats.mine : stats.all) : null;
  const deleteTarget = deleteId ? todos.find((t) => t.id === deleteId) : null;

  // Fetch data
  const doFetch = useCallback(() => {
    fetchTodos({ scope, filters: { ...filters, search: debouncedSearch }, hideDone, page, pageSize: 20 });
  }, [fetchTodos, scope, filters.source, filters.priority, filters.dueFilter, debouncedSearch, hideDone, page]);

  useEffect(() => { doFetch(); }, [doFetch]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Save view preference
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("todoView", view);
  }, [view]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowNewDialog(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Actions
  const handleQuickAdd = async (title: string, priority: string) => {
    const ok = await quickAdd(title, priority);
    if (ok) { doFetch(); fetchStats(); }
    return ok;
  };

  const handleToggleComplete = async (id: string) => {
    await toggleComplete(id);
    fetchStats();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await changeStatus(id, status);
    fetchStats();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTodo(deleteId);
    fetchStats();
    setDeleteId(null);
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    const statusMap: Record<string, string> = { todo: "TODO", inprogress: "IN_PROGRESS", done: "DONE" };
    const newStatus = statusMap[result.destination.droppableId];
    await reorderKanban(result.draggableId, newStatus, result.destination.index);
    fetchStats();
  };

  const handleFilterChange = (f: FiltersType) => {
    setFilters(f);
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({ search: "", source: "", priority: "", dueFilter: "" });
    setPage(1);
  };

  const handleNewDialogClose = () => {
    setShowNewDialog(false);
    doFetch();
    fetchStats();
  };

  const handleUpdateFromDetail = (updated: TodoItemData) => {
    updateLocal(updated);
    fetchStats();
  };

  const handleDeleteFromDetail = () => {
    doFetch();
    fetchStats();
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 h-full">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 m-0">Công Việc</h1>
          <p className="text-xs sm:text-[13px] text-gray-500 mt-0.5">Quản lý và theo dõi công việc</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {canViewAll && (
            <select
              value={scope}
              onChange={(e) => { setScope(e.target.value as "mine" | "all"); setPage(1); }}
              className="px-2.5 py-2 border border-gray-300 rounded-lg text-[13px] font-semibold outline-none bg-white cursor-pointer focus:border-blue-400 transition-colors"
            >
              <option value="mine">Của tôi</option>
              <option value="all">Tất cả</option>
            </select>
          )}

          {/* View toggle */}
          <div className="flex border-[1.5px] border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-3 sm:px-3 py-2 sm:py-1.5 border-none cursor-pointer text-xs font-semibold flex items-center gap-1 transition-colors ${
                view === "list" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <ListTodo size={14} /> <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`px-3 sm:px-3 py-2 sm:py-1.5 border-none border-l border-gray-200 cursor-pointer text-xs font-semibold flex items-center gap-1 transition-colors ${
                view === "kanban" ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Columns3 size={14} /> <span className="hidden sm:inline">Kanban</span>
            </button>
          </div>

          <button
            onClick={() => setShowNewDialog(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg border-none bg-blue-600 text-white text-[13px] font-semibold cursor-pointer hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} /> <span className="hidden sm:inline">Thêm mới</span>
          </button>
        </div>
      </div>

      {/* Reminder banner (replaces popup) */}
      <TodoReminderBanner
        onViewOverdue={() => {
          setFilters((f) => ({ ...f, dueFilter: "overdue" }));
          setPage(1);
        }}
      />

      {/* Quick add */}
      <TodoQuickAdd onAdd={handleQuickAdd} />

      {/* Summary cards */}
      <TodoSummaryCards
        stats={scopeStats}
        onClickOverdue={() => {
          setFilters((f) => ({ ...f, dueFilter: "overdue" }));
          setPage(1);
        }}
      />

      {/* Filters */}
      <TodoFilters
        filters={filters}
        hideDone={hideDone}
        onFilterChange={handleFilterChange}
        onHideDoneChange={setHideDone}
        onReset={resetFilters}
      />

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-auto">
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
          <TodoKanbanView
            todos={todos}
            onDragEnd={handleDragEnd}
            onSelect={setSelectedTodo}
          />
        )}
      </div>

      {/* Detail panel */}
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

      {/* Delete confirmation from list */}
      {deleteId && deleteTarget && (
        <DeleteConfirmDialog
          title={deleteTarget.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      {/* Order detail */}
      <OrderDetailDialog
        requestCode={orderDetailCode}
        open={!!orderDetailCode}
        onClose={() => setOrderDetailCode(null)}
        userRole={userRole}
      />

      {/* New Todo Dialog */}
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
