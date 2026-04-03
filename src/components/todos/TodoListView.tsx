"use client";

import { ChevronLeft, ChevronRight, Pencil, Trash2, UserCheck } from "lucide-react";
import { format } from "date-fns";

import { PRIORITY_CONFIG, SOURCE_CONFIG, STATUS_CONFIG } from "./constants";
import type { TodoItemData, TodoPagination } from "@/types/todo";

const TEXT = {
  empty: "Ch\u01b0a c\u00f3 c\u00f4ng vi\u1ec7c n\u00e0o",
  assignedBy: (name: string) => `Giao b\u1edfi ${name}`,
  created: "T\u1ea1o",
  commentIcon: "💬",
  clock: "⏰",
  done: "✓",
  emptyCell: "—",
  edit: "S\u1eeda",
  delete: "X\u00f3a",
  total: "T\u1ed5ng",
  headers: {
    title: "Ti\u00eau \u0111\u1ec1",
    orderCode: "M\u00e3 \u0111\u01a1n",
    priority: "\u01afu ti\u00ean",
    status: "Tr\u1ea1ng th\u00e1i",
    dueDate: "Th\u1eddi h\u1ea1n",
    createdAt: "Ng\u00e0y t\u1ea1o",
    completedAt: "Ho\u00e0n th\u00e0nh",
    assignee: "Ng\u01b0\u1eddi PT",
    source: "Ngu\u1ed3n",
  },
} as const;

interface TodoListViewProps {
  todos: TodoItemData[];
  pagination: TodoPagination;
  onToggleComplete: (todo: TodoItemData) => void;
  onStatusChange: (todo: TodoItemData, status: string) => void;
  onSelect: (todo: TodoItemData) => void;
  onDelete: (id: string) => void;
  onViewOrder: (code: string) => void;
  onPageChange: (page: number) => void;
}

function isDueOverdue(dateValue: string | null) {
  if (!dateValue) return false;
  return new Date(dateValue) < new Date();
}

function isDueToday(dateValue: string | null) {
  if (!dateValue) return false;
  return new Date(dateValue).toDateString() === new Date().toDateString();
}

export function TodoListView({
  todos,
  pagination,
  onToggleComplete,
  onStatusChange,
  onSelect,
  onDelete,
  onViewOrder,
  onPageChange,
}: TodoListViewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="block divide-y divide-gray-100 sm:hidden">
        {todos.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">{TEXT.empty}</div>
        ) : (
          todos.map((todo) => {
            const isDone = todo.status === "DONE";
            const overdue = !isDone && isDueOverdue(todo.dueDate);
            const today = !isDone && isDueToday(todo.dueDate);

            return (
              <div key={todo.id} className={`px-4 py-3 ${isDone ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => onToggleComplete(todo)}
                      className="h-[18px] w-[18px] cursor-pointer accent-blue-600"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      onClick={() => onSelect(todo)}
                      className={`cursor-pointer truncate text-sm font-semibold text-slate-800 ${isDone ? "line-through" : ""}`}
                    >
                      {todo.title}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${PRIORITY_CONFIG[todo.priority]?.twBg || ""}`}>
                        {PRIORITY_CONFIG[todo.priority]?.label}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_CONFIG[todo.status]?.twBg || ""}`}>
                        {STATUS_CONFIG[todo.status]?.label}
                      </span>
                      {todo.source !== "MANUAL" && (
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${SOURCE_CONFIG[todo.source]?.twBg || ""}`}>
                          {SOURCE_CONFIG[todo.source]?.label}
                        </span>
                      )}
                    </div>

                    {todo.createdBy && todo.assignee && todo.createdById !== todo.assigneeId && (
                      <div className="mt-1.5 flex w-fit items-center gap-1 rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[11px] text-purple-600">
                        <UserCheck size={10} />
                        <span className="font-medium">{TEXT.assignedBy(todo.createdBy.name)}</span>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex flex-wrap items-center gap-2">
                        {todo.dueDate && (
                          <span className={`font-medium ${overdue ? "text-red-600" : today ? "text-amber-600" : ""}`}>
                            {TEXT.clock} {format(new Date(todo.dueDate), "dd/MM HH:mm")}
                          </span>
                        )}
                        <span className="text-gray-400">{TEXT.created}: {format(new Date(todo.createdAt), "dd/MM HH:mm")}</span>
                        {todo.completedAt && (
                          <span className="text-green-600">{TEXT.done} {format(new Date(todo.completedAt), "dd/MM HH:mm")}</span>
                        )}
                        {todo.assignee?.name && <span>{todo.assignee.name}</span>}
                      </div>

                      <div className="flex gap-1">
                        <button onClick={() => onSelect(todo)} className="rounded-md border border-gray-200 bg-white p-2.5 text-gray-500">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => onDelete(todo.id)} className="rounded-md border border-red-200 bg-white p-2.5 text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-[800px] w-full border-collapse text-xs">
          <thead>
            <tr className="border-b-[1.5px] border-gray-200 bg-slate-50">
              <th className="w-9 p-2 text-center">☐</th>
              <th className="px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.title}</th>
              <th className="w-[120px] px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.orderCode}</th>
              <th className="w-[90px] px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.priority}</th>
              <th className="w-[110px] px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.status}</th>
              <th className="w-[100px] px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.dueDate}</th>
              <th className="w-[110px] px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.createdAt}</th>
              <th className="w-[110px] px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.completedAt}</th>
              <th className="w-[100px] px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.assignee}</th>
              <th className="w-[80px] px-2.5 py-2 text-left font-semibold text-slate-600">{TEXT.headers.source}</th>
              <th className="w-[70px] px-2.5 py-2" />
            </tr>
          </thead>

          <tbody>
            {todos.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center text-gray-400">{TEXT.empty}</td>
              </tr>
            ) : (
              todos.map((todo, index) => {
                const isDone = todo.status === "DONE";
                const overdue = !isDone && isDueOverdue(todo.dueDate);
                const today = !isDone && isDueToday(todo.dueDate);

                return (
                  <tr
                    key={todo.id}
                    className={`border-b border-slate-100 transition-colors hover:bg-blue-50/30 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    } ${isDone ? "opacity-50" : ""}`}
                  >
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => onToggleComplete(todo)}
                        className="h-4 w-4 cursor-pointer accent-blue-600"
                      />
                    </td>

                    <td className="px-2.5 py-2">
                      <span onClick={() => onSelect(todo)} className={`cursor-pointer font-semibold text-slate-800 transition-colors hover:text-blue-600 ${isDone ? "line-through" : ""}`}>
                        {todo.title}
                      </span>
                      {(todo._count?.comments ?? 0) > 0 && (
                        <span className="ml-1.5 text-[10px] text-gray-400">{TEXT.commentIcon}{todo._count!.comments}</span>
                      )}
                    </td>

                    <td className="px-2.5 py-2">
                      {todo.linkedOrder ? (
                        <button onClick={() => onViewOrder(todo.linkedOrder!.requestCode)} className="border-none bg-transparent p-0 text-xs font-semibold text-blue-600 hover:underline">
                          {todo.linkedOrder!.requestCode}
                        </button>
                      ) : (
                        <span className="text-gray-300">{TEXT.emptyCell}</span>
                      )}
                    </td>

                    <td className="px-2.5 py-2">
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_CONFIG[todo.priority]?.twBg || ""}`}>
                        {PRIORITY_CONFIG[todo.priority]?.label}
                      </span>
                    </td>

                    <td className="px-2.5 py-2">
                      <select
                        value={todo.status}
                        onChange={(event) => onStatusChange(todo, event.target.value)}
                        className={`cursor-pointer rounded-md border border-gray-200 px-1.5 py-1 text-[11px] font-semibold outline-none ${STATUS_CONFIG[todo.status]?.twBg || ""}`}
                      >
                        {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                          <option key={key} value={key}>{value.label}</option>
                        ))}
                      </select>
                    </td>

                    <td className={`px-2.5 py-2 ${overdue ? "font-semibold text-red-600" : today ? "font-semibold text-amber-600" : "text-slate-600"}`}>
                      {todo.dueDate ? format(new Date(todo.dueDate), "dd/MM/yyyy HH:mm") : <span className="text-gray-300">{TEXT.emptyCell}</span>}
                    </td>

                    <td className="px-2.5 py-2 text-slate-500">{format(new Date(todo.createdAt), "dd/MM/yyyy HH:mm")}</td>

                    <td className="px-2.5 py-2">
                      {todo.completedAt ? (
                        <span className="font-medium text-green-600">{format(new Date(todo.completedAt), "dd/MM/yyyy HH:mm")}</span>
                      ) : (
                        <span className="text-gray-300">{TEXT.emptyCell}</span>
                      )}
                    </td>

                    <td className="max-w-[100px] px-2.5 py-2 font-medium text-slate-800">
                      <div className="truncate">{todo.assignee?.name || TEXT.emptyCell}</div>
                      {todo.createdBy && todo.assignee && todo.createdById !== todo.assigneeId && (
                        <div className="mt-0.5 flex items-center gap-0.5 text-[11px] text-purple-600" title={TEXT.assignedBy(todo.createdBy.name)}>
                          <UserCheck size={10} />
                          <span className="truncate">{TEXT.assignedBy(todo.createdBy.name)}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-2.5 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_CONFIG[todo.source]?.twBg || ""}`}>
                        {SOURCE_CONFIG[todo.source]?.label}
                      </span>
                    </td>

                    <td className="px-2.5 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => onSelect(todo)}
                          className="rounded-md border border-gray-200 bg-white p-1 text-gray-500 transition-colors hover:bg-gray-50"
                          title={TEXT.edit}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => onDelete(todo.id)}
                          className="rounded-md border border-red-200 bg-white p-1 text-red-600 transition-colors hover:bg-red-50"
                          title={TEXT.delete}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-gray-500">
          <span>{TEXT.total}: {pagination.total}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="rounded-md border border-gray-200 bg-white p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="tabular-nums font-semibold">{pagination.page}/{pagination.totalPages}</span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="rounded-md border border-gray-200 bg-white p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
