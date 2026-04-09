"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { buildInlineStaffNoteSaveState } from "@/lib/inline-staff-note-state";

export function InlineStaffNote({
  requestCode,
  initialValue,
}: {
  requestCode: string;
  initialValue: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousValue = useRef(initialValue);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  useEffect(() => {
    setValue(initialValue);
    previousValue.current = initialValue;
  }, [initialValue]);

  const save = useCallback(async () => {
    const draftValue = value;
    const trimmedDraft = draftValue.trim();
    const trimmedPrevious = previousValue.current.trim();

    if (trimmedDraft === trimmedPrevious) {
      setValue(trimmedDraft);
      setEditing(false);
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/orders/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestCode, staffNotes: trimmedDraft }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const nextState = buildInlineStaffNoteSaveState({
          previousValue: previousValue.current,
          draftValue,
          ok: false,
          errorMessage: payload.error || "Không thể lưu ghi chú",
        });
        setValue(nextState.value);
        setError(nextState.error);
        setEditing(nextState.editing);
        return;
      }

      const payload = await response.json().catch(() => ({}));
      const persistedValue = typeof payload.staffNotes === "string" ? payload.staffNotes : trimmedDraft;
      const nextState = buildInlineStaffNoteSaveState({
        previousValue: previousValue.current,
        draftValue: persistedValue,
        ok: true,
      });

      previousValue.current = nextState.previousValue;
      setValue(nextState.value);
      setSaved(nextState.saved);
      setEditing(nextState.editing);
      setTimeout(() => setSaved(false), 1400);
    } catch {
      const nextState = buildInlineStaffNoteSaveState({
        previousValue: previousValue.current,
        draftValue,
        ok: false,
        errorMessage: "Không thể lưu ghi chú",
      });
      setValue(nextState.value);
      setError(nextState.error);
      setEditing(nextState.editing);
    } finally {
      setSaving(false);
    }
  }, [requestCode, value]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void save();
    }

    if (event.key === "Escape") {
      setValue(previousValue.current);
      setEditing(false);
      setError(null);
    }
  };

  if (editing) {
    return (
      <div className="space-y-1">
        <textarea
          ref={textareaRef}
          rows={3}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => void save()}
          onKeyDown={handleKeyDown}
          disabled={saving}
          className="w-full rounded-md border border-blue-500 bg-amber-50 px-2 py-1.5 text-[11px] text-slate-800 outline-none ring-2 ring-blue-100"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-400">Enter để lưu, Shift+Enter để xuống dòng</p>
          {saving && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Đang lưu...
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Nhấn để sửa ghi chú"
        aria-label="Sửa ghi chú nhân viên"
        className={`relative w-full rounded-md border px-2 py-1.5 text-left text-[11px] transition-all ${
          value
            ? "border-slate-200 bg-amber-50 text-slate-700"
            : "border-dashed border-slate-300 bg-transparent italic text-slate-400"
        }`}
      >
        <span className="block break-words">{value || "Ghi chú..."}</span>
        {saving && (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center justify-center rounded-full bg-white/90 p-1 text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
          </span>
        )}
        {saved && !saving && (
          <span className="absolute right-1.5 top-1.5 inline-flex items-center justify-center rounded-full bg-emerald-500 p-1 text-white">
            <Check className="h-3 w-3" />
          </span>
        )}
      </button>

      {error && (
        <div className="inline-flex items-center gap-1 text-[10px] font-medium text-red-500">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}
