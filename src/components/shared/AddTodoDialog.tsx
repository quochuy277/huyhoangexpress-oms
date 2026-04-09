"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckSquare, Loader2, X } from "lucide-react";

import { useTodoUsers } from "@/hooks/useTodoUsers";

const TEXT = {
  success: "Đã tạo công việc thành công",
  genericError: "Có lỗi xảy ra",
  networkError: "Lỗi kết nối, vui lòng thử lại",
  title: "Thêm vào Công Việc",
  closeLabel: "Đóng hộp thoại thêm công việc",
  todoTitle: "Tiêu đề công việc",
  todoPlaceholder: "Nhập tiêu đề...",
  description: "Mô tả",
  descriptionPlaceholder: "Mô tả chi tiết...",
  priority: "Mức ưu tiên",
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp",
  dueDate: "Thời hạn",
  assignTo: "Gán cho nhân viên",
  assignSelf: "Tôi (mặc định)",
  cancel: "Hủy",
  submitting: "Đang tạo...",
  submit: "Tạo công việc",
} as const;

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
  open,
  onClose,
  defaultTitle,
  defaultDescription,
  defaultPriority,
  linkedOrderId,
  source,
  userRole,
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    setTitle(defaultTitle);
    setDescription(defaultDescription);
    setPriority(defaultPriority);
    setDueDate("");
    setAssigneeId("");
    setToast(null);

    if (!userRole) {
      void fetch("/api/auth/me")
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data?.role) setResolvedRole(data.role);
        })
        .catch(() => {});
    } else {
      setResolvedRole(userRole);
    }
  }, [defaultDescription, defaultPriority, defaultTitle, open, userRole]);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    setToast(null);

    try {
      const response = await fetch("/api/todos", {
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

      if (response.ok) {
        setToast({ type: "success", msg: TEXT.success });
        setTimeout(() => {
          onClose();
          setToast(null);
        }, 1000);
      } else {
        const data = await response.json().catch(() => ({}));
        setToast({ type: "error", msg: data.error || TEXT.genericError });
      }
    } catch {
      setToast({ type: "error", msg: TEXT.networkError });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, open]);

  if (!open || !mounted) return null;

  const inputClass =
    "w-full rounded-lg border-[1.5px] border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition-all focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] bg-black/50" onClick={onClose} />

      <div className="pointer-events-none fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div className="pointer-events-auto flex h-[100dvh] w-full max-w-full animate-[dialogIn_0.2s_ease-out] flex-col rounded-none border-0 bg-white shadow-xl sm:h-auto sm:max-h-[calc(100vh-32px)] sm:w-[480px] sm:rounded-xl sm:border-[1.5px] sm:border-blue-600">
          <div className="shrink-0 border-b border-gray-200 p-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="text-blue-600" size={20} />
                <span className="text-lg font-semibold text-slate-800">{TEXT.title}</span>
              </div>
              <button
                onClick={onClose}
                className="rounded-md border-none bg-transparent p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-slate-800"
                aria-label={TEXT.closeLabel}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 sm:px-6">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">
                {TEXT.todoTitle} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void handleSubmit()}
                placeholder={TEXT.todoPlaceholder}
                className={inputClass}
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">{TEXT.description}</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={TEXT.descriptionPlaceholder}
                rows={3}
                className={`${inputClass} resize-none font-[inherit]`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">{TEXT.priority}</label>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as typeof priority)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="LOW">{TEXT.low}</option>
                  <option value="MEDIUM">{TEXT.medium}</option>
                  <option value="HIGH">{TEXT.high}</option>
                  <option value="URGENT">{TEXT.urgent}</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">{TEXT.dueDate}</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {canAssign && users.length > 0 && (
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">{TEXT.assignTo}</label>
                <select
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">{TEXT.assignSelf}</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {toast && (
              <div
                className={`rounded-lg border px-3.5 py-2.5 text-[13px] font-medium ${
                  toast.type === "success"
                    ? "border-green-200 bg-green-50 text-green-600"
                    : "border-red-200 bg-red-50 text-red-600"
                }`}
              >
                {toast.msg}
              </div>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 p-5 pt-4 sm:p-6">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-transparent px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {TEXT.cancel}
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !title.trim()}
              className="flex items-center gap-1.5 rounded-lg border-none bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? TEXT.submitting : TEXT.submit}
            </button>
          </div>
        </div>
      </div>

      <style>{`@keyframes dialogIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }`}</style>
    </>,
    document.body,
  );
}
