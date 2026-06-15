"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CalendarClock, Columns3, ListTodo, Loader2, Plus } from "lucide-react";

const AddTodoDialog = dynamic(() => import("@/components/shared/AddTodoDialog").then((m) => ({ default: m.AddTodoDialog })), { loading: () => null });
const OrderDetailDialog = dynamic(() => import("@/components/shared/OrderDetailDialog").then((m) => ({ default: m.OrderDetailDialog })), { loading: () => null });
import { useTodos } from "@/hooks/useTodos";
import { useTodoStats } from "@/hooks/useTodoStats";
import { useTodoUsers } from "@/hooks/useTodoUsers";
import {
  getTodoStatsForSelection,
  parseTodoScopeSelection,
  type TodoScopeSelection,
} from "@/lib/todo-scope";
import type { TodoFilters as FiltersType, TodoItemData } from "@/types/todo";
import type { TodoBootstrapData } from "@/lib/todo-bootstrap-state";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { TodoDetailPanel } from "./TodoDetailPanel";
import { TodoFilters } from "./TodoFilters";
import { TodoKanbanView } from "./TodoKanbanView";
import { TodoListView } from "./TodoListView";
import { TodoQuickAdd } from "./TodoQuickAdd";
import { TodoReminderBanner } from "./TodoReminderBanner";
import { TodoSummaryCards } from "./TodoSummaryCards";
import { TodoTodayView } from "./TodoTodayView";
import type { KanbanSortField } from "./constants";

const TEXT = {
  title: "Công việc",
  subtitle: "Quản lý và theo dõi công việc",
  mine: "Của tôi",
  all: "Tất cả",
  create: "Thêm mới",
} as const;

export default function TodosClient({
  userId,
  userName,
  userRole,
  canViewAllTodos,
  initialData,
}: {
  userId: string;
  userName: string;
  userRole: string;
  canViewAllTodos?: boolean;
  initialData: TodoBootstrapData;
}) {
  const [view, setView] = useState<"today" | "list" | "kanban">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("todoView") as "today" | "list" | "kanban") || "today";
    }
    return "today";
  });
  const [listSort, setListSort] = useState<{ by: string; dir: "asc" | "desc" } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("todoListSort");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [kanbanSort, setKanbanSort] = useState<Record<string, KanbanSortField>>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("todoKanbanSort");
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    }
    return {};
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
  const [searchInput, setSearchInput] = useState(() => filters.search);
  const [selectedTodo, setSelectedTodo] = useState<TodoItemData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [orderDetailCode, setOrderDetailCode] = useState<string | null>(null);

  const {
    todos,
    loading,
    pagination,
    fetchTodos,
    toggleComplete,
    changeStatus,
    deleteTodo,
    quickAdd,
    reorderKanban,
    updateLocal,
    skipInitialFetchRef,
  } = useTodos({ todos: initialData.todos, pagination: initialData.pagination });
  const { stats, fetchStats, skipInitialFetchRef: skipInitialStatsFetchRef } = useTodoStats(initialData.stats);

  const canViewAll = canViewAllTodos ?? (userRole === "ADMIN" || userRole === "MANAGER");
  const { users } = useTodoUsers(canViewAll, initialData.users);
  const { scope, assigneeId } = parseTodoScopeSelection(scopeSelection);
  const scopeStats = getTodoStatsForSelection(stats, scopeSelection);
  const deleteTarget = deleteId ? todos.find((todo) => todo.id === deleteId) : null;

  const mode: "list" | "board" | "focus" =
    view === "today" ? "focus" : view === "kanban" ? "board" : "list";

  const doFetch = useCallback(() => {
    fetchTodos({
      scope,
      assigneeId,
      filters,
      hideDone,
      page,
      pageSize: 20,
      mode,
      sortBy: listSort?.by,
      sortDir: listSort?.dir,
    });
  }, [assigneeId, fetchTodos, filters, hideDone, page, scope, mode, listSort]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      // Bootstrap đã seed dữ liệu focus cho view "today" → bỏ qua fetch lần đầu.
      if (view === "today") return;
    }
    // view đổi → mode đổi → doFetch đổi → effect tự chạy lại; không cần view trong deps.
    void doFetch();
  }, [doFetch, skipInitialFetchRef]);

  useEffect(() => {
    if (skipInitialStatsFetchRef.current) {
      skipInitialStatsFetchRef.current = false;
      return;
    }

    void fetchStats(assigneeId);
  }, [assigneeId, fetchStats, skipInitialStatsFetchRef]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("todoView", view);
  }, [view]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (listSort === null) localStorage.removeItem("todoListSort");
    else localStorage.setItem("todoListSort", JSON.stringify(listSort));
  }, [listSort]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("todoKanbanSort", JSON.stringify(kanbanSort));
  }, [kanbanSort]);

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
      void doFetch();
      void fetchStats(assigneeId);
    }
    return ok;
  };

  const handleToggleComplete = async (todo: TodoItemData) => {
    await toggleComplete(todo);
    void fetchStats(assigneeId);
  };

  const handleStatusChange = async (todo: TodoItemData, status: string) => {
    await changeStatus(todo, status);
    void fetchStats(assigneeId);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTodo(deleteId);
    void fetchStats(assigneeId);
    setDeleteId(null);
  };

  const handleListSortChange = (field: string) => {
    if (!field) {
      setListSort(null);
      setPage(1);
      return;
    }
    setListSort((current) => {
      if (current?.by === field) {
        return { by: field, dir: current.dir === "asc" ? "desc" : "asc" };
      }
      return { by: field, dir: "asc" };
    });
    setPage(1);
  };

  const handleKanbanSortChange = (columnId: string, field: KanbanSortField) => {
    setKanbanSort((current) => ({ ...current, [columnId]: field }));
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const sameColumn = result.source.droppableId === result.destination.droppableId;
    if (sameColumn && (kanbanSort[result.destination.droppableId] ?? "manual") !== "manual") {
      return; // đang sắp theo trường → không cho đổi thứ tự trong cột
    }

    const statusMap: Record<string, string> = {
      todo: "TODO",
      inprogress: "IN_PROGRESS",
      done: "DONE",
    };
    const nextStatus = statusMap[result.destination.droppableId];
    const draggedTodo = todos.find((todo) => todo.id === result.draggableId);
    if (!draggedTodo || !nextStatus) return;

    await reorderKanban(draggedTodo, nextStatus, result.destination.index);
    void fetchStats(assigneeId);
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
    void doFetch();
    void fetchStats(assigneeId);
  };

  const handleUpdateFromDetail = (updated: TodoItemData) => {
    updateLocal(updated);
    void fetchStats(assigneeId);
  };

  const handleDeleteFromDetail = () => {
    void doFetch();
    void fetchStats(assigneeId);
  };

  return (
    <div className="flex h-full flex-col gap-3 sm:gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="m-0 text-lg font-bold text-slate-800 sm:text-xl">{TEXT.title}</h1>
          <p className="mt-0.5 text-xs text-gray-500 sm:text-[13px]">{TEXT.subtitle}</p>
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
              <option value="mine">{TEXT.mine}</option>
              <option value="all">{TEXT.all}</option>
              {users.map((user) => (
                <option key={user.id} value={`user:${user.id}`}>
                  {user.name || user.id}
                </option>
              ))}
            </select>
          )}

          <div className="flex overflow-hidden rounded-lg border-[1.5px] border-gray-200">
            {([
              { key: "today", label: "Hôm nay", Icon: CalendarClock },
              { key: "list", label: "Danh sách", Icon: ListTodo },
              { key: "kanban", label: "Kanban", Icon: Columns3 },
            ] as const).map((opt, idx) => (
              <button
                key={opt.key}
                onClick={() => setView(opt.key)}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold transition-colors sm:py-1.5 ${idx > 0 ? "border-l border-gray-200" : ""} ${
                  view === opt.key ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <opt.Icon size={14} /> <span className="hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowNewDialog(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 sm:px-4"
          >
            <Plus size={15} /> <span className="hidden sm:inline">{TEXT.create}</span>
          </button>
        </div>
      </div>

      <TodoReminderBanner
        initialReminder={initialData.reminders}
        onViewOverdue={() => {
          setView("list");
          setFilters((current) => ({ ...current, dueFilter: "overdue" }));
          setPage(1);
        }}
      />

      <TodoQuickAdd onAdd={handleQuickAdd} />

      <TodoSummaryCards
        stats={scopeStats}
        onClickDueToday={() => {
          setView("list");
          setFilters((current) => ({ ...current, dueFilter: "today" }));
          setPage(1);
        }}
        onClickOverdue={() => {
          setView("list");
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
        ) : view === "today" ? (
          <TodoTodayView
            todos={todos}
            onToggleComplete={handleToggleComplete}
            onSelect={setSelectedTodo}
            onDelete={setDeleteId}
            onViewOrder={setOrderDetailCode}
          />
        ) : view === "list" ? (
          <TodoListView
            todos={todos}
            pagination={pagination}
            sortBy={listSort?.by ?? null}
            sortDir={listSort?.dir ?? null}
            onSortChange={handleListSortChange}
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
            columnSort={kanbanSort}
            onColumnSortChange={handleKanbanSortChange}
            onDragEnd={handleDragEnd}
            onSelect={setSelectedTodo}
          />
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
