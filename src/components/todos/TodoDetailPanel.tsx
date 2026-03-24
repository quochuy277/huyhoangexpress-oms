"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, Loader2, Check, Pencil, Trash2, RotateCcw, Send, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { PRIORITY_CONFIG, STATUS_CONFIG, SOURCE_CONFIG } from "./constants";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useTodoUsers } from "@/hooks/useTodoUsers";
import type { TodoItemData, TodoComment } from "@/types/todo";
import { OrderDetailDialog } from "@/components/shared/OrderDetailDialog";

interface TodoDetailPanelProps {
  todo: TodoItemData;
  onClose: () => void;
  onUpdate: (t: TodoItemData) => void;
  onDelete: (id: string) => void;
  userId: string;
  userName: string;
  userRole: string;
}

function toDatetimeLocalValue(d: string | null) {
  if (!d) return "";
  return format(new Date(d), "yyyy-MM-dd'T'HH:mm");
}

export function TodoDetailPanel({ todo, onClose, onUpdate, onDelete, userId, userName, userRole }: TodoDetailPanelProps) {
  const canEditAssignee = userRole === "ADMIN" || userRole === "MANAGER";
  const { users } = useTodoUsers(canEditAssignee);

  // Use passed todo data immediately, then enrich with API data (comments)
  const [detail, setDetail] = useState<TodoItemData & { comments?: TodoComment[] }>({ ...todo, comments: [] });
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(todo.title);
  const [showDelete, setShowDelete] = useState(false);
  const [orderDetailCode, setOrderDetailCode] = useState<string | null>(null);

  // Fetch full detail (for comments & linked order)
  useEffect(() => {
    setLoading(true);
    setDetail({ ...todo, comments: [] });
    setTitleInput(todo.title);
    fetch(`/api/todos/${todo.id}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d);
        setTitleInput(d.title);
      })
      .finally(() => setLoading(false));
  }, [todo.id]);

  const saveField = async (field: string, value: unknown) => {
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDetail(updated);
      onUpdate(updated);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/todos/${todo.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      if (res.ok) {
        const c: TodoComment = await res.json();
        setDetail((d) => ({ ...d, comments: [c, ...(d.comments || [])] }));
        setComment("");
      }
    } finally {
      setSending(false);
    }
  };

  const handleComplete = async () => {
    const res = await fetch(`/api/todos/${todo.id}/complete`, { method: "PATCH" });
    if (res.ok) {
      const updated = await res.json();
      setDetail((d) => ({ ...d, ...updated }));
      onUpdate({ ...detail, ...updated });
    }
  };

  const handleDelete = async () => {
    await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
    onDelete(todo.id);
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[10050] bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] z-[10051] bg-white shadow-[-4px_0_20px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden animate-[slideInRight_0.2s_ease-out]">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="text-sm font-bold text-slate-800">Chi tiết công việc</div>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {loading && !detail.comments?.length ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-gray-500" size={24} />
          </div>
        ) : (
          <div className="flex-1 overflow-auto px-5 py-5 space-y-5">
            {/* Title */}
            {editTitle ? (
              <div className="flex gap-2">
                <input
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { saveField("title", titleInput); setEditTitle(false); } }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-base font-bold outline-none focus:border-blue-400"
                  autoFocus
                />
                <button onClick={() => { saveField("title", titleInput); setEditTitle(false); }} className="px-3 py-2 rounded-lg border border-gray-200 text-blue-600 bg-white hover:bg-blue-50 transition-colors">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditTitle(false)} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-500 bg-white hover:bg-gray-50 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setEditTitle(true)}
                className={`text-base font-bold text-slate-800 cursor-pointer flex items-center gap-1.5 group ${
                  detail.status === "DONE" ? "line-through opacity-50" : ""
                }`}
              >
                {detail.title}
                <Pencil size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
              </div>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${STATUS_CONFIG[detail.status]?.twBg || ""}`}>
                {STATUS_CONFIG[detail.status]?.label}
              </span>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${PRIORITY_CONFIG[detail.priority]?.twBg || ""}`}>
                {PRIORITY_CONFIG[detail.priority]?.label}
              </span>
              {detail.source !== "MANUAL" && (
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md ${SOURCE_CONFIG[detail.source]?.twBg || ""}`}>
                  {SOURCE_CONFIG[detail.source]?.label}
                </span>
              )}
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
              {/* Description */}
              <div>
                <label className="text-[11px] font-semibold text-gray-500 block mb-1">Mô tả</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none resize-y focus:border-blue-400 transition-colors"
                  value={detail.description || ""}
                  onChange={(e) => setDetail((d) => ({ ...d, description: e.target.value }))}
                  onBlur={(e) => saveField("description", e.target.value)}
                  placeholder="Thêm mô tả..."
                />
              </div>

              {/* Grid: priority, status, due, assignee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">Mức ưu tiên</label>
                  <select
                    value={detail.priority}
                    onChange={(e) => saveField("priority", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none cursor-pointer focus:border-blue-400 transition-colors"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">Trạng thái</label>
                  <select
                    value={detail.status}
                    onChange={(e) => saveField("status", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none cursor-pointer focus:border-blue-400 transition-colors"
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">Thời hạn</label>
                  <input
                    type="datetime-local"
                    value={toDatetimeLocalValue(detail.dueDate)}
                    onChange={(e) => saveField("dueDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">Người phụ trách</label>
                  {canEditAssignee ? (
                    <select
                      value={detail.assigneeId || ""}
                      onChange={(e) => saveField("assigneeId", e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none cursor-pointer focus:border-blue-400 transition-colors"
                    >
                      <option value="">— Chưa phân công —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === "ADMIN" ? "Admin" : u.role === "MANAGER" ? "QL" : "NV"})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-slate-800 font-medium py-2">{detail.assignee?.name || "—"}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Linked order */}
            {detail.linkedOrder && (
              <div className="bg-slate-50 border border-slate-200 rounded-[10px] p-3.5">
                <div className="text-xs font-bold text-slate-600 mb-2">🔗 Đơn hàng liên kết</div>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div><span className="text-gray-400">Mã YC: </span><span className="text-blue-600 font-semibold">{detail.linkedOrder.requestCode}</span></div>
                  <div><span className="text-gray-400">Shop: </span><span className="font-medium">{detail.linkedOrder.shopName}</span></div>
                  <div><span className="text-gray-400">Trạng thái: </span><span className="font-medium">{detail.linkedOrder.status}</span></div>
                  <div><span className="text-gray-400">COD: </span><span className="font-medium">{(detail.linkedOrder.codAmount || 0).toLocaleString("vi-VN")}đ</span></div>
                </div>
                <button
                  onClick={() => setOrderDetailCode(detail.linkedOrder!.requestCode)}
                  className="text-xs text-blue-600 font-semibold mt-2 inline-flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer hover:underline"
                >
                  Xem chi tiết đơn <ExternalLink size={11} />
                </button>
              </div>
            )}

            {/* Comments */}
            <div>
              <div className="text-xs font-bold text-slate-600 mb-2.5">
                💬 Ghi chú ({detail.comments?.length || 0})
              </div>
              <div className="flex gap-2 mb-3">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addComment()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-400 transition-colors"
                  placeholder="Thêm ghi chú..."
                />
                <button
                  onClick={addComment}
                  disabled={sending}
                  className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 cursor-pointer hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {sending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                </button>
              </div>
              <div className="space-y-0">
                {(detail.comments || []).map((c) => (
                  <div key={c.id} className="py-2 border-b border-slate-100 text-xs last:border-none">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">{c.authorName}</span>
                      <span className="text-gray-400">{format(new Date(c.createdAt), "dd/MM HH:mm")}</span>
                    </div>
                    <div className="text-slate-600 mt-1">{c.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        {detail && (
          <div className="px-5 py-3 border-t border-gray-200 flex justify-between shrink-0">
            <button
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-xs font-medium cursor-pointer hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} /> Xóa
            </button>
            <button
              onClick={handleComplete}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border-none text-white text-[13px] font-semibold cursor-pointer transition-colors ${
                detail.status === "DONE"
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {detail.status === "DONE" ? (
                <><RotateCcw size={14} /> Mở lại</>
              ) : (
                <><Check size={14} /> Hoàn thành</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <DeleteConfirmDialog
          title={detail.title}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {/* Order detail */}
      <OrderDetailDialog
        requestCode={orderDetailCode}
        open={!!orderDetailCode}
        onClose={() => setOrderDetailCode(null)}
        userRole={userRole}
        baseZIndex={10200}
      />

      <style>{`@keyframes slideInRight { from { transform:translateX(100%) } to { transform:translateX(0) } }`}</style>
    </>,
    document.body
  );
}
