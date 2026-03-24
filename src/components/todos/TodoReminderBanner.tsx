"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import type { TodoReminder } from "@/types/todo";

interface TodoReminderBannerProps {
  onViewOverdue: () => void;
}

export function TodoReminderBanner({ onViewOverdue }: TodoReminderBannerProps) {
  const [reminder, setReminder] = useState<TodoReminder | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetch("/api/todos/reminders")
      .then((r) => r.json())
      .then((data: TodoReminder) => {
        if ((data.overdue?.count || 0) > 0 || (data.dueToday?.count || 0) > 0) {
          setReminder(data);
        }
      })
      .catch(() => {});
  }, []);

  if (!reminder || dismissed) return null;

  const overdueCount = reminder.overdue?.count || 0;
  const todayCount = reminder.dueToday?.count || 0;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-sm animate-[slideDown_0.3s_ease-out]">
      <AlertTriangle size={18} className="text-amber-500 shrink-0" />
      <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
        {overdueCount > 0 && (
          <span className="text-red-600 font-semibold whitespace-nowrap">
            {overdueCount} quá hạn
          </span>
        )}
        {todayCount > 0 && (
          <span className="text-amber-700 font-semibold whitespace-nowrap">
            {todayCount} đến hạn hôm nay
          </span>
        )}
      </div>
      <button
        onClick={() => { onViewOverdue(); setDismissed(true); }}
        className="shrink-0 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-transparent border-none cursor-pointer whitespace-nowrap"
      >
        Xem <ChevronRight size={12} />
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-0.5"
      >
        <X size={14} />
      </button>
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}
