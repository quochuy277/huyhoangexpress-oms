"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ExternalLink, Loader2, Pencil, RotateCcw, Send, Trash2, X } from "lucide-react";
import { format } from "date-fns";

import { OrderDetailDialog } from "@/components/shared/OrderDetailDialog";
import { useTodoUsers } from "@/hooks/useTodoUsers";
import type { TodoComment, TodoItemData } from "@/types/todo";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { PRIORITY_CONFIG, SOURCE_CONFIG, STATUS_CONFIG } from "./constants";

interface TodoDetailPanelProps {
  todo: TodoItemData;
  onClose: () => void;
  onUpdate: (todo: TodoItemData) => void;
  onDelete: (id: string) => void;
  userId: string;
  userName: string;
  userRole: string;
}

type TodoDetailState = TodoItemData & {
  comments?: TodoComment[];
};

function toDatetimeLocalValue(value: string | null) {
  if (!value) return "";
  return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
}

async function readJsonSafely(response: Response) {
  return response.json().catch(() => null);
}

export function TodoDetailPanel({
  todo,
  onClose,
  onUpdate,
  onDelete,
  userId,
  userName,
  userRole,
}: TodoDetailPanelProps) {
  const canEditAssignee = userRole === "ADMIN" || userRole === "MANAGER";
  const { users } = useTodoUsers(canEditAssignee);

  const [detail, setDetail] = useState<TodoDetailState>({ ...todo, comments: [] });
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(todo.title);
  const [showDelete, setShowDelete] = useState(false);
  const [orderDetailCode, setOrderDetailCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refreshDetail = async (showConflictNotice = false) => {
    const response = await fetch(`/api/todos/${todo.id}`);
    if (!response.ok) {
      return;
    }

    const latest = await response.json();
    setDetail(latest);
    setTitleInput(latest.title);
    onUpdate(latest);
    if (showConflictNotice) {
      setNotice("Công việc vừa được người khác cập nhật. Mình đã tải lại dữ liệu mới nhất.");
    }
  };

  useEffect(() => {
    setLoading(true);
    setNotice(null);
    setDetail({ ...todo, comments: [] });
    setTitleInput(todo.title);

    void fetch(`/api/todos/${todo.id}`)
      .then((response) => response.json())
      .then((data) => {
        setDetail(data);
        setTitleInput(data.title);
      })
      .finally(() => setLoading(false));
  }, [todo.id]);

  const saveField = async (field: string, value: unknown) => {
    setNotice(null);
    const response = await fetch(`/api/todos/${todo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value, version: detail.version }),
    });

    if (response.ok) {
      const updated = await response.json();
      setDetail(updated);
      onUpdate(updated);
      return;
    }

    const payload = await readJsonSafely(response);
    if (response.status === 409) {
      await refreshDetail(true);
      return;
    }

    setNotice(payload?.error || "Không thể cập nhật công việc. Vui lòng thử lại.");
  };

  const addComment = async () => {
    if (!comment.trim()) return;

    setSending(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/todos/${todo.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });

      if (response.ok) {
        const newComment: TodoComment = await response.json();
        setDetail((current) => ({ ...current, comments: [newComment, ...(current.comments || [])] }));
        setComment("");
      }
    } finally {
      setSending(false);
    }
  };

  const handleComplete = async () => {
    setNotice(null);
    const response = await fetch(`/api/todos/${todo.id}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: detail.version }),
    });

    if (response.ok) {
      const updated = await response.json();
      setDetail((current) => ({ ...current, ...updated }));
      onUpdate({ ...detail, ...updated });
      return;
    }

    if (response.status === 409) {
      await refreshDetail(true);
      return;
    }

    const payload = await readJsonSafely(response);
    setNotice(payload?.error || "Không thể cập nhật trạng thái công việc.");
  };

  const handleDelete = async () => {
    await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
    onDelete(todo.id);
    onClose();
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[10050] bg-black/40" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-[10051] flex w-full flex-col overflow-hidden bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.1)] animate-[slideInRight_0.2s_ease-out] sm:w-[480px]">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="text-sm font-bold text-slate-800">Chi tiết công việc</div>
          <button
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent text-gray-500 transition-colors hover:text-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        {loading && !detail.comments?.length ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="animate-spin text-gray-500" size={24} />
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-auto px-5 py-5">
            {notice && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {notice}
              </div>
            )}

            {editTitle ? (
              <div className="flex gap-2">
                <input
                  value={titleInput}
                  onChange={(event) => setTitleInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void saveField("title", titleInput);
                      setEditTitle(false);
                    }
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base font-bold outline-none focus:border-blue-400"
                  autoFocus
                />
                <button
                  onClick={() => {
                    void saveField("title", titleInput);
                    setEditTitle(false);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-blue-600 transition-colors hover:bg-blue-50"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setEditTitle(false)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-500 transition-colors hover:bg-gray-50"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setEditTitle(true)}
                className={`group flex cursor-pointer items-center gap-1.5 text-base font-bold text-slate-800 ${
                  detail.status === "DONE" ? "line-through opacity-50" : ""
                }`}
              >
                {detail.title}
                <Pencil size={12} className="opacity-0 transition-opacity group-hover:opacity-40" />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${STATUS_CONFIG[detail.status]?.twBg || ""}`}
              >
                {STATUS_CONFIG[detail.status]?.label}
              </span>
              <span
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_CONFIG[detail.priority]?.twBg || ""}`}
              >
                {PRIORITY_CONFIG[detail.priority]?.label}
              </span>
              {detail.source !== "MANUAL" && (
                <span
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${SOURCE_CONFIG[detail.source]?.twBg || ""}`}
                >
                  {SOURCE_CONFIG[detail.source]?.label}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Mô tả</label>
                <textarea
                  rows={3}
                  className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400"
                  value={detail.description || ""}
                  onChange={(event) => setDetail((current) => ({ ...current, description: event.target.value }))}
                  onBlur={(event) => void saveField("description", event.target.value)}
                  placeholder="Thêm mô tả..."
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-500">Mức ưu tiên</label>
                  <select
                    value={detail.priority}
                    onChange={(event) => void saveField("priority", event.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-500">Trạng thái</label>
                  <select
                    value={detail.status}
                    onChange={(event) => void saveField("status", event.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400"
                  >
                    {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-500">Thời hạn</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocalValue(detail.dueDate)}
                    onChange={(event) =>
                      void saveField(
                        "dueDate",
                        event.target.value ? new Date(event.target.value).toISOString() : null,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-500">Người phụ trách</label>
                  {canEditAssignee ? (
                    <select
                      value={detail.assigneeId || ""}
                      onChange={(event) => void saveField("assigneeId", event.target.value || null)}
                      className="w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400"
                    >
                      <option value="">— Chưa phân công —</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.role === "ADMIN" ? "Admin" : user.role === "MANAGER" ? "QL" : "NV"})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="py-2 text-sm font-medium text-slate-800">{detail.assignee?.name || "—"}</div>
                  )}
                </div>
              </div>
            </div>

            {detail.linkedOrder && (
              <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3.5">
                <div className="mb-2 text-xs font-bold text-slate-600">Đơn hàng liên kết</div>
                <div className="grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                  <div>
                    <span className="text-gray-400">Mã YC: </span>
                    <span className="font-semibold text-blue-600">{detail.linkedOrder.requestCode}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Shop: </span>
                    <span className="font-medium">{detail.linkedOrder.shopName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Trạng thái: </span>
                    <span className="font-medium">{detail.linkedOrder.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">COD: </span>
                    <span className="font-medium">
                      {(detail.linkedOrder.codAmount || 0).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setOrderDetailCode(detail.linkedOrder!.requestCode)}
                  className="mt-2 inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-xs font-semibold text-blue-600 hover:underline"
                >
                  Xem chi tiết đơn <ExternalLink size={11} />
                </button>
              </div>
            )}

            <div>
              <div className="mb-2.5 text-xs font-bold text-slate-600">Ghi chú ({detail.comments?.length || 0})</div>
              <div className="mb-3 flex gap-2">
                <input
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && void addComment()}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-400"
                  placeholder="Thêm ghi chú..."
                />
                <button
                  onClick={() => void addComment()}
                  disabled={sending}
                  className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                </button>
              </div>

              <div className="space-y-0">
                {(detail.comments || []).map((todoComment) => (
                  <div key={todoComment.id} className="border-b border-slate-100 py-2 text-xs last:border-none">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">{todoComment.authorName}</span>
                      <span className="text-gray-400">
                        {format(new Date(todoComment.createdAt), "dd/MM HH:mm")}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-600">{todoComment.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex shrink-0 justify-between border-t border-gray-200 px-5 py-3">
          <button
            onClick={() => setShowDelete(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 size={14} /> Xóa
          </button>
          <button
            onClick={() => void handleComplete()}
            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border-none px-4 py-2 text-[13px] font-semibold text-white transition-colors ${
              detail.status === "DONE" ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {detail.status === "DONE" ? (
              <>
                <RotateCcw size={14} /> Mở lại
              </>
            ) : (
              <>
                <Check size={14} /> Hoàn thành
              </>
            )}
          </button>
        </div>
      </div>

      {showDelete && (
        <DeleteConfirmDialog
          title={detail.title}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      <OrderDetailDialog
        requestCode={orderDetailCode}
        open={Boolean(orderDetailCode)}
        onClose={() => setOrderDetailCode(null)}
        userRole={userRole}
        baseZIndex={10200}
      />

      <style>{`@keyframes slideInRight { from { transform:translateX(100%) } to { transform:translateX(0) } }`}</style>
    </>,
    document.body,
  );
}
