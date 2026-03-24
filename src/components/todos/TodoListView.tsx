"use client";

import { Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { PRIORITY_CONFIG, STATUS_CONFIG, SOURCE_CONFIG } from "./constants";
import type { TodoItemData, TodoPagination } from "@/types/todo";

interface TodoListViewProps {
  todos: TodoItemData[];
  pagination: TodoPagination;
  onToggleComplete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onSelect: (todo: TodoItemData) => void;
  onDelete: (id: string) => void;
  onViewOrder: (code: string) => void;
  onPageChange: (page: number) => void;
}

function isDueOverdue(d: string | null) {
  if (!d) return false;
  return new Date(d) < new Date();
}
function isDueToday(d: string | null) {
  if (!d) return false;
  return new Date(d).toDateString() === new Date().toDateString();
}

export function TodoListView({
  todos, pagination, onToggleComplete, onStatusChange, onSelect, onDelete, onViewOrder, onPageChange,
}: TodoListViewProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Mobile card view */}
      <div className="block sm:hidden divide-y divide-gray-100">
        {todos.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Chưa có công việc nào</div>
        ) : (
          todos.map((t) => {
            const isDone = t.status === "DONE";
            const overdue = !isDone && isDueOverdue(t.dueDate);
            const today = !isDone && isDueToday(t.dueDate);
            return (
              <div key={t.id} className={`px-4 py-3 ${isDone ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => onToggleComplete(t.id)}
                    className="mt-1 w-4 h-4 accent-blue-600 cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      onClick={() => onSelect(t)}
                      className={`text-sm font-semibold text-slate-800 cursor-pointer truncate ${isDone ? "line-through" : ""}`}
                    >
                      {t.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${PRIORITY_CONFIG[t.priority]?.twBg || ""}`}>
                        {PRIORITY_CONFIG[t.priority]?.label}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS_CONFIG[t.status]?.twBg || ""}`}>
                        {STATUS_CONFIG[t.status]?.label}
                      </span>
                      {t.source !== "MANUAL" && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${SOURCE_CONFIG[t.source]?.twBg || ""}`}>
                          {SOURCE_CONFIG[t.source]?.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[11px] text-gray-500">
                      <div className="flex items-center gap-2">
                        {t.dueDate && (
                          <span className={`font-medium ${overdue ? "text-red-600" : today ? "text-amber-600" : ""}`}>
                            ⏰ {format(new Date(t.dueDate), "dd/MM HH:mm")}
                          </span>
                        )}
                        {t.assignee?.name && <span>{t.assignee.name}</span>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => onSelect(t)} className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-500"><Pencil size={12} /></button>
                        <button onClick={() => onDelete(t.id)} className="p-1.5 rounded-md border border-red-200 bg-white text-red-600"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse text-xs min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 border-b-[1.5px] border-gray-200">
              <th className="p-2 w-9 text-center">☐</th>
              <th className="px-2.5 py-2 text-left font-semibold text-slate-600">Tiêu Đề</th>
              <th className="px-2.5 py-2 text-left font-semibold text-slate-600 w-[120px]">Mã Đơn</th>
              <th className="px-2.5 py-2 text-left font-semibold text-slate-600 w-[90px]">Ưu Tiên</th>
              <th className="px-2.5 py-2 text-left font-semibold text-slate-600 w-[110px]">Trạng Thái</th>
              <th className="px-2.5 py-2 text-left font-semibold text-slate-600 w-[100px]">Thời Hạn</th>
              <th className="px-2.5 py-2 text-left font-semibold text-slate-600 w-[100px]">Người PT</th>
              <th className="px-2.5 py-2 text-left font-semibold text-slate-600 w-[80px]">Nguồn</th>
              <th className="px-2.5 py-2 w-[70px]"></th>
            </tr>
          </thead>
          <tbody>
            {todos.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-gray-400">
                  Chưa có công việc nào
                </td>
              </tr>
            ) : (
              todos.map((t, i) => {
                const isDone = t.status === "DONE";
                const overdue = !isDone && isDueOverdue(t.dueDate);
                const today = !isDone && isDueToday(t.dueDate);
                return (
                  <tr
                    key={t.id}
                    className={`border-b border-slate-100 transition-colors hover:bg-blue-50/30 ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    } ${isDone ? "opacity-50" : ""}`}
                  >
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => onToggleComplete(t.id)}
                        className="w-4 h-4 cursor-pointer accent-blue-600"
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <span
                        onClick={() => onSelect(t)}
                        className={`font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors ${isDone ? "line-through" : ""}`}
                      >
                        {t.title}
                      </span>
                      {(t._count?.comments ?? 0) > 0 && (
                        <span className="text-[10px] text-gray-400 ml-1.5">💬{t._count!.comments}</span>
                      )}
                    </td>
                    <td className="px-2.5 py-2">
                      {t.linkedOrder ? (
                        <button
                          onClick={() => onViewOrder(t.linkedOrder!.requestCode)}
                          className="bg-transparent border-none p-0 text-blue-600 font-semibold cursor-pointer text-xs hover:underline"
                        >
                          {t.linkedOrder.requestCode}
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-2.5 py-2">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${PRIORITY_CONFIG[t.priority]?.twBg || ""}`}
                      >
                        {PRIORITY_CONFIG[t.priority]?.label}
                      </span>
                    </td>
                    <td className="px-2.5 py-2">
                      <select
                        value={t.status}
                        onChange={(e) => onStatusChange(t.id, e.target.value)}
                        className={`text-[11px] font-semibold px-1.5 py-1 rounded-md border border-gray-200 cursor-pointer outline-none ${STATUS_CONFIG[t.status]?.twBg || ""}`}
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className={`px-2.5 py-2 ${overdue ? "text-red-600 font-semibold" : today ? "text-amber-600 font-semibold" : "text-slate-600"}`}>
                      {t.dueDate ? format(new Date(t.dueDate), "dd/MM/yyyy") : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-2.5 py-2 font-medium text-slate-800 truncate max-w-[100px]">
                      {t.assignee?.name || "—"}
                    </td>
                    <td className="px-2.5 py-2">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${SOURCE_CONFIG[t.source]?.twBg || ""}`}
                      >
                        {SOURCE_CONFIG[t.source]?.label}
                      </span>
                    </td>
                    <td className="px-2.5 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => onSelect(t)}
                          className="p-1 rounded-md border border-gray-200 bg-white text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors"
                          title="Sửa"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="p-1 rounded-md border border-red-200 bg-white text-red-600 cursor-pointer hover:bg-red-50 transition-colors"
                          title="Xóa"
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center px-4 py-2.5 border-t border-slate-100 text-xs text-gray-500">
          <span>Tổng: {pagination.total}</span>
          <div className="flex gap-2 items-center">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="p-1.5 rounded-md border border-gray-200 bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-semibold tabular-nums">
              {pagination.page}/{pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="p-1.5 rounded-md border border-gray-200 bg-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
