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
    <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-gray-200 bg-white px-3 py-2.5 transition-colors focus-within:border-blue-300 sm:gap-3 sm:px-4">
      <span className="shrink-0 text-base">📝</span>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && void handleAdd()}
        placeholder="Th\u00eam vi\u1ec7c nhanh... (Enter)"
        className="min-w-0 flex-1 border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-gray-400"
      />
      <div className="flex shrink-0 items-center gap-1">
        {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((itemPriority) => (
          <button
            key={itemPriority}
            onClick={() => setPriority(itemPriority)}
            title={PRIORITY_CONFIG[itemPriority].label}
            className="h-7 w-7 cursor-pointer rounded-full border-2 transition-all"
            style={{
              borderColor: priority === itemPriority ? PRIORITY_CONFIG[itemPriority].dot : "#d1d5db",
              background: priority === itemPriority ? PRIORITY_CONFIG[itemPriority].dot : "transparent",
            }}
          />
        ))}
      </div>
      {adding && <Loader2 className="shrink-0 animate-spin text-gray-500" size={16} />}
    </div>
  );
}
