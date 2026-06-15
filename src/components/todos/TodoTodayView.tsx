"use client";

import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

import { classifyDue } from "@/lib/todo-dates";
import type { TodoItemData } from "@/types/todo";
import { PRIORITY_CONFIG, SOURCE_CONFIG } from "./constants";

interface TodoTodayViewProps {
  todos: TodoItemData[];
  onToggleComplete: (todo: TodoItemData) => void;
  onStatusChange: (todo: TodoItemData, status: string) => void;
  onSelect: (todo: TodoItemData) => void;
  onDelete: (id: string) => void;
  onViewOrder: (code: string) => void;
}

function Row({
  todo,
  overdue,
  onToggleComplete,
  onSelect,
  onDelete,
  onViewOrder,
}: {
  todo: TodoItemData;
  overdue: boolean;
  onToggleComplete: (todo: TodoItemData) => void;
  onSelect: (todo: TodoItemData) => void;
  onDelete: (id: string) => void;
  onViewOrder: (code: string) => void;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-none hover:bg-blue-50/30">
      <input
        type="checkbox"
        checked={todo.status === "DONE"}
        onChange={() => onToggleComplete(todo)}
        className="mt-0.5 h-[18px] w-[18px] cursor-pointer accent-blue-600"
      />
      <div className="min-w-0 flex-1">
        <div
          onClick={() => onSelect(todo)}
          className="cursor-pointer truncate text-sm font-semibold text-slate-800 hover:text-blue-600"
        >
          {todo.title}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className={`rounded px-1.5 py-0.5 font-semibold ${PRIORITY_CONFIG[todo.priority]?.twBg || ""}`}>
            {PRIORITY_CONFIG[todo.priority]?.label}
          </span>
          {todo.source !== "MANUAL" && (
            <span className={`rounded px-1.5 py-0.5 font-semibold ${SOURCE_CONFIG[todo.source]?.twBg || ""}`}>
              {SOURCE_CONFIG[todo.source]?.label}
            </span>
          )}
          {todo.dueDate && (
            <span className={`font-medium ${overdue ? "text-red-600" : "text-amber-600"}`}>
              ⏰ {format(new Date(todo.dueDate), "dd/MM HH:mm")}
            </span>
          )}
          {todo.linkedOrder && (
            <button
              onClick={() => onViewOrder(todo.linkedOrder!.requestCode)}
              className="font-semibold text-blue-600 hover:underline"
            >
              {todo.linkedOrder.requestCode}
            </button>
          )}
          {todo.assignee?.name && <span className="text-gray-400">{todo.assignee.name}</span>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button onClick={() => onSelect(todo)} className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-500 hover:bg-gray-50">
          <Pencil size={14} />
        </button>
        <button onClick={() => onDelete(todo.id)} className="rounded-md border border-red-200 bg-white p-1.5 text-red-600 hover:bg-red-50">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function TodoTodayView({
  todos,
  onToggleComplete,
  onStatusChange: _onStatusChange,
  onSelect,
  onDelete,
  onViewOrder,
}: TodoTodayViewProps) {
  const now = new Date();
  const overdue = todos
    .filter((t) => classifyDue(t.dueDate, t.status, now) === "overdue")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  const today = todos
    .filter((t) => classifyDue(t.dueDate, t.status, now) === "today")
    .sort((a, b) => {
      const rank: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const byPriority = (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
      if (byPriority !== 0) return byPriority;
      return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
    });

  if (overdue.length === 0 && today.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
        Hết việc cần xử lý hôm nay 🎉
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-red-200 bg-white">
          <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-[13px] font-bold text-red-600">
            Quá hạn ({overdue.length})
          </div>
          {overdue.map((todo) => (
            <Row key={todo.id} todo={todo} overdue onToggleComplete={onToggleComplete} onSelect={onSelect} onDelete={onDelete} onViewOrder={onViewOrder} />
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-600">
          Đến hạn hôm nay ({today.length})
        </div>
        {today.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">Không còn việc đến hạn hôm nay</div>
        ) : (
          today.map((todo) => (
            <Row key={todo.id} todo={todo} overdue={false} onToggleComplete={onToggleComplete} onSelect={onSelect} onDelete={onDelete} onViewOrder={onViewOrder} />
          ))
        )}
      </div>
    </div>
  );
}
