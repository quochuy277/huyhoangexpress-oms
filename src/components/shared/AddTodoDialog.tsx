"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckSquare, Loader2, X } from "lucide-react";
import { useTodoUsers } from "@/hooks/useTodoUsers";

interface AddTodoDialogProps {
  open: boolean;
  onClose: () => void;
  defaultTitle: string;
  defaultDescription: string;
  defaultPriority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  linkedOrderId?: string;
  source?: string;
  userRole?: string;
}

export function AddTodoDialog({
  open, onClose, defaultTitle, defaultDescription, defaultPriority, linkedOrderId, source, userRole,
}: AddTodoDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [priority, setPriority] = useState(defaultPriority);
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [assigneeId, setAssigneeId] = useState("");
  const [resolvedRole, setResolvedRole] = useState(userRole || "");

  const canAssign = resolvedRole === "ADMIN" || resolvedRole === "MANAGER";
  const { users } = useTodoUsers(canAssign);

  useEffect(() => { setMounted(true); }, []);

  // Reset fields when dialog opens
  useEffect(() => {
    if (!open) return;
    setTitle(defaultTitle);
    setDescription(defaultDescription);
    setPriority(defaultPriority);
    setDueDate("");
    setAssigneeId("");
    setToast(null);

    // Auto-detect role if not provided
    if (!userRole) {
      fetch("/api/auth/me")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.role) setResolvedRole(data.role); })
        .catch(() => {});
    } else {
      setResolvedRole(userRole);
    }
  }, [open, defaultTitle, defaultDescription, defaultPriority, userRole]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);
    setToast(null);

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          dueDate: dueDate || null,
          linkedOrderId: linkedOrderId || null,
          source: source || "MANUAL",
          assigneeId: assigneeId || null,
        }),
      });

      if (res.ok) {
        setToast({ type: "success", msg: "Đã tạo công việc thành công" });
        setTimeout(() => { onClose(); setToast(null); }, 1000);
      } else {
        const data = await res.json().catch(() => ({}));
        setToast({ type: "error", msg: data.error || "Có lỗi xảy ra" });
      }
    } catch {
      setToast({ type: "error", msg: "Lỗi kết nối, vui lòng thử lại" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const inputClass = "w-full bg-white border-[1.5px] border-gray-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  const dialog = (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/50" onClick={onClose} />

      {/* Dialog wrapper - flexbox centering */}
      <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-4 pointer-events-none">
        <div className="h-[100dvh] w-full max-w-full bg-white border-0 rounded-none shadow-xl flex flex-col pointer-events-auto animate-[dialogIn_0.2s_ease-out] sm:h-auto sm:max-h-[calc(100vh-32px)] sm:w-[480px] sm:border-[1.5px] sm:border-blue-600 sm:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-5 sm:p-6 pb-4 shrink-0">
          <div className="flex items-center gap-2">
            <CheckSquare className="text-blue-600" size={20} />
            <span className="text-lg font-semibold text-slate-800">Thêm vào Công Việc</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-slate-800 hover:bg-gray-100 rounded-md p-1 transition-colors bg-transparent border-none cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form - scrollable */}
        <div className="flex flex-col gap-4 overflow-y-auto flex-1 px-5 sm:px-6">
          {/* Title */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
              Tiêu đề công việc <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Nhập tiêu đề..."
              className={inputClass}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết..."
              rows={3}
              className={`${inputClass} resize-none font-[inherit]`}
            />
          </div>

          {/* Priority & Due date in grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Mức ưu tiên</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Thời hạn</label>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Assignee (Admin/Manager only) */}
          {canAssign && users.length > 0 && (
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Gán cho nhân viên</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">Tôi (mặc định)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div className={`text-[13px] px-3.5 py-2.5 rounded-lg font-medium ${
              toast.type === "success"
                ? "bg-green-50 text-green-600 border border-green-200"
                : "bg-red-50 text-red-600 border border-red-200"
            }`}>
              {toast.type === "success" ? "✅ " : "❌ "}{toast.msg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 p-5 sm:p-6 pt-4 shrink-0">
          <button
            onClick={onClose}
            className="bg-transparent border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="bg-blue-600 text-white border-none px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? "Đang tạo..." : "Tạo công việc"}
          </button>
        </div>
        </div>
      </div>
      <style>{`@keyframes dialogIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }`}</style>
    </>
  );

  return createPortal(dialog, document.body);
}
