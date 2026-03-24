"use client";

import { ListTodo, AlertTriangle, Clock, Check } from "lucide-react";
import type { TodoStats } from "@/types/todo";

interface TodoSummaryCardsProps {
  stats: TodoStats | null;
  onClickOverdue: () => void;
}

const cards = [
  { key: "today" as const, label: "Tổng việc hôm nay", color: "text-blue-600", borderColor: "border-l-blue-600", bg: "bg-blue-50", icon: ListTodo },
  { key: "overdue" as const, label: "Quá hạn", color: "text-red-600", borderColor: "border-l-red-600", bg: "bg-red-50", icon: AlertTriangle, clickable: true },
  { key: "inProgress" as const, label: "Đang làm", color: "text-amber-600", borderColor: "border-l-amber-600", bg: "bg-amber-50", icon: Clock },
  { key: "doneWeek" as const, label: "Hoàn thành tuần này", color: "text-green-600", borderColor: "border-l-green-600", bg: "bg-green-50", icon: Check },
];

export function TodoSummaryCards({ stats, onClickOverdue }: TodoSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        const value = stats?.[c.key] ?? 0;
        return (
          <button
            key={c.key}
            onClick={c.clickable ? onClickOverdue : undefined}
            className={`${c.bg} ${c.borderColor} border-l-[3px] border border-l-current rounded-[10px] px-3 sm:px-4 py-3 sm:py-3.5 text-left transition-all ${
              c.clickable ? "cursor-pointer hover:shadow-md active:scale-[0.98]" : "cursor-default"
            }`}
            style={{ borderColor: "transparent", borderLeftColor: "currentColor" }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xl sm:text-2xl font-extrabold ${c.color}`}>{value}</span>
              <Icon size={16} className={`${c.color} opacity-50 hidden sm:block`} />
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-gray-500 leading-tight">{c.label}</div>
          </button>
        );
      })}
    </div>
  );
}
