"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PRIORITY_CONFIG } from "./constants";

interface TodoQuickAddProps {
  onAdd: (title: string, priority: string) => Promise<boolean>;
}

export function TodoQuickAdd({ onAdd }: TodoQuickAddProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!title.trim() || adding) return;
    setAdding(true);
    try {
      const ok = await onAdd(title.trim(), priority);
      if (ok) setTitle("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-[1.5px] border-gray-200 rounded-[10px] bg-white transition-colors focus-within:border-blue-300">
      <span className="text-base shrink-0">📝</span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Thêm việc nhanh... (Enter)"
        className="flex-1 min-w-0 border-none outline-none text-sm bg-transparent text-slate-800 placeholder:text-gray-400"
      />
      <div className="flex gap-1 items-center shrink-0">
        {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            title={PRIORITY_CONFIG[p].label}
            className="w-7 h-7 rounded-full cursor-pointer transition-all border-2"
            style={{
              borderColor: priority === p ? PRIORITY_CONFIG[p].dot : "#d1d5db",
              background: priority === p ? PRIORITY_CONFIG[p].dot : "transparent",
            }}
          />
        ))}
      </div>
      {adding && <Loader2 className="animate-spin shrink-0 text-gray-500" size={16} />}
    </div>
  );
}
