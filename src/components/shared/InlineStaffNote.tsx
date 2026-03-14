"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check } from "lucide-react";

export function InlineStaffNote({ requestCode, initialValue }: { requestCode: string; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevValue = useRef(initialValue);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  const save = useCallback(async () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed === prevValue.current.trim()) return;
    prevValue.current = trimmed;
    setValue(trimmed);
    try {
      const res = await fetch("/api/orders/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestCode, staffNotes: trimmed }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1400);
      }
    } catch { /* silent */ }
  }, [value, requestCode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
    if (e.key === "Escape") { setValue(prevValue.current); setEditing(false); }
  };

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        style={{
          width: "100%",
          fontSize: "11px",
          lineHeight: "1.35",
          color: "#1a1a1a",
          background: "#fffff0",
          border: "1px solid #2563EB",
          borderRadius: "4px",
          padding: "4px 5px",
          outline: "none",
          resize: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
          boxShadow: "0 0 0 2px rgba(37,99,235,0.12)",
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Click để sửa ghi chú"
      style={{
        position: "relative",
        cursor: "text",
        fontSize: "11px",
        lineHeight: "1.35",
        color: value ? "#374151" : "#9ca3af",
        fontStyle: value ? "normal" : "italic",
        background: value ? "#fffef5" : "transparent",
        borderRadius: "4px",
        padding: "3px 5px",
        border: value ? "1px solid #e5e7eb" : "1px dashed #d1d5db",
        minHeight: "20px",
        wordBreak: "break-word",
        transition: "all 0.15s",
      }}
    >
      {value || "Ghi chú..."}
      {saved && (
        <span style={{
          position: "absolute",
          top: "-2px",
          right: "-2px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "14px",
          height: "14px",
          borderRadius: "50%",
          background: "#16a34a",
          color: "#fff",
          animation: "fadeInOut 1.4s ease-in-out",
        }}>
          <Check style={{ width: "9px", height: "9px" }} />
        </span>
      )}
    </div>
  );
}
