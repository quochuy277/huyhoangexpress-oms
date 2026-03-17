"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search, Plus, Loader2, Check, X, ChevronLeft, ChevronRight,
  Calendar, Trash2, CheckSquare, ListTodo, Columns3, RotateCcw,
  Clock, AlertTriangle, Zap, Send, ExternalLink, Pencil,
  Circle,
} from "lucide-react";
import { format } from "date-fns";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";

/* ============================================================
   CONSTANTS
   ============================================================ */
const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  URGENT: { label: "Khẩn cấp", color: "#dc2626", bg: "#fef2f2", border: "#fecaca", dot: "#EF4444" },
  HIGH: { label: "Cao", color: "#d97706", bg: "#fffbeb", border: "#fde68a", dot: "#F59E0B" },
  MEDIUM: { label: "Trung bình", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", dot: "#2563EB" },
  LOW: { label: "Thấp", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", dot: "#9CA3AF" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  TODO: { label: "Cần làm", color: "#6b7280", bg: "#f3f4f6" },
  IN_PROGRESS: { label: "Đang làm", color: "#d97706", bg: "#fffbeb" },
  DONE: { label: "Hoàn thành", color: "#16a34a", bg: "#f0fdf4" },
};

const SOURCE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  MANUAL: { label: "Thủ công", color: "#6b7280", bg: "#f3f4f6" },
  FROM_DELAYED: { label: "Đơn hoãn", color: "#d97706", bg: "#fffbeb" },
  FROM_RETURNS: { label: "Đơn hoàn", color: "#eab308", bg: "#fefce8" },
  FROM_CLAIMS: { label: "Khiếu nại", color: "#dc2626", bg: "#fef2f2" },
  FROM_ORDERS: { label: "Đơn hàng", color: "#2563eb", bg: "#eff6ff" },
};

const DUE_FILTER_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "overdue", label: "Quá hạn" },
  { value: "today", label: "Hôm nay" },
  { value: "week", label: "Tuần này" },
  { value: "month", label: "Tháng này" },
  { value: "none", label: "Không có thời hạn" },
];

const inputStyle: React.CSSProperties = {
  padding: "7px 12px", border: "1px solid #d1d5db", borderRadius: "8px",
  fontSize: "13px", outline: "none", background: "#fff",
};

const btnSecondary: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px",
  borderRadius: "8px", border: "1.5px solid #e5e7eb", background: "#fff",
  fontSize: "12px", fontWeight: 500, cursor: "pointer", color: "#374151",
};

/* ============================================================
   HELPERS
   ============================================================ */
function isDueOverdue(d: string | null) {
  if (!d) return false;
  return new Date(d) < new Date();
}
function isDueToday(d: string | null) {
  if (!d) return false;
  const due = new Date(d).toDateString();
  return due === new Date().toDateString();
}
function formatDueDate(d: string | null) {
  if (!d) return null;
  return format(new Date(d), "dd/MM/yyyy HH:mm");
}
function toDatetimeLocalValue(d: string | null) {
  if (!d) return "";
  return format(new Date(d), "yyyy-MM-dd'T'HH:mm");
}

/* ============================================================
   DETAIL PANEL (Sheet)
   ============================================================ */
function TodoDetailPanel({ todo, onClose, onUpdate, onDelete, userId, userName, userRole }: {
  todo: any; onClose: () => void; onUpdate: (t: any) => void; onDelete: (id: string) => void;
  userId: string; userName: string; userRole: string;
}) {
  const canEditAssignee = userRole === "ADMIN" || userRole === "MANAGER";
  const [users, setUsers] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/todos/${todo.id}`)
      .then(r => r.json())
      .then(d => { setDetail(d); setTitleInput(d.title); })
      .finally(() => setLoading(false));
  }, [todo.id]);

  // Fetch users for assignee dropdown
  useEffect(() => {
    if (canEditAssignee) {
      fetch("/api/todos/users")
        .then(r => r.json())
        .then(d => setUsers(d.users || []))
        .catch(() => {});
    }
  }, [canEditAssignee]);

  const saveField = async (field: string, value: any) => {
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: comment }),
      });
      if (res.ok) {
        const c = await res.json();
        setDetail((d: any) => ({ ...d, comments: [c, ...(d.comments || [])] }));
        setComment("");
      }
    } finally { setSending(false); }
  };

  const handleComplete = async () => {
    const res = await fetch(`/api/todos/${todo.id}/complete`, { method: "PATCH" });
    if (res.ok) {
      const updated = await res.json();
      setDetail((d: any) => ({ ...d, ...updated }));
      onUpdate({ ...detail, ...updated });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa công việc này?")) return;
    await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
    onDelete(todo.id);
    onClose();
  };

  return createPortal(
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "480px", maxWidth: "100vw",
        zIndex: 10051, background: "#fff", boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>Chi tiết công việc</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={18} /></button>
        </div>

        {loading || !detail ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 className="animate-spin" size={24} color="#6b7280" /></div>
        ) : (
          <div style={{ flex: 1, overflow: "auto", padding: "20px" }}>
            {/* Title */}
            {editTitle ? (
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <input value={titleInput} onChange={e => setTitleInput(e.target.value)} style={{ ...inputStyle, flex: 1, fontWeight: 700, fontSize: "16px" }} autoFocus />
                <button onClick={() => { saveField("title", titleInput); setEditTitle(false); }} style={{ ...btnSecondary, color: "#2563eb" }}><Check size={14} /></button>
                <button onClick={() => setEditTitle(false)} style={btnSecondary}><X size={14} /></button>
              </div>
            ) : (
              <div onClick={() => setEditTitle(true)} style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "16px", cursor: "pointer", textDecoration: detail.status === "DONE" ? "line-through" : "none", opacity: detail.status === "DONE" ? 0.5 : 1 }}>
                {detail.title} <Pencil size={12} style={{ opacity: 0.3, marginLeft: "4px" }} />
              </div>
            )}

            {/* Status + Priority badges */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px", background: STATUS_CONFIG[detail.status]?.bg, color: STATUS_CONFIG[detail.status]?.color }}>
                {STATUS_CONFIG[detail.status]?.label}
              </span>
              <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px", background: PRIORITY_CONFIG[detail.priority]?.bg, color: PRIORITY_CONFIG[detail.priority]?.color }}>
                {PRIORITY_CONFIG[detail.priority]?.label}
              </span>
              {detail.source !== "MANUAL" && (
                <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px", background: SOURCE_CONFIG[detail.source]?.bg, color: SOURCE_CONFIG[detail.source]?.color }}>
                  {SOURCE_CONFIG[detail.source]?.label}
                </span>
              )}
            </div>

            {/* Editable fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "4px" }}>Mô tả</label>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, width: "100%", resize: "vertical" }}
                  value={detail.description || ""}
                  onChange={e => setDetail((d: any) => ({ ...d, description: e.target.value }))}
                  onBlur={e => saveField("description", e.target.value)}
                  placeholder="Thêm mô tả..."
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "4px" }}>Mức ưu tiên</label>
                  <select value={detail.priority} onChange={e => saveField("priority", e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "4px" }}>Trạng thái</label>
                  <select value={detail.status} onChange={e => saveField("status", e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "4px" }}>Thời hạn</label>
                  <input type="datetime-local" value={toDatetimeLocalValue(detail.dueDate)} onChange={e => saveField("dueDate", e.target.value ? new Date(e.target.value).toISOString() : null)} style={{ ...inputStyle, width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "4px" }}>Người phụ trách</label>
                  {canEditAssignee ? (
                    <select value={detail.assigneeId || ""} onChange={e => saveField("assigneeId", e.target.value || null)} style={{ ...inputStyle, width: "100%" }}>
                      <option value="">— Chưa phân công —</option>
                      {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role === "ADMIN" ? "Admin" : u.role === "MANAGER" ? "QL" : "NV"})</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: "13px", color: "#1e293b", fontWeight: 500 }}>{detail.assignee?.name || "—"}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Linked order */}
            {detail.linkedOrder && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginBottom: "20px" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "8px" }}>🔗 Đơn hàng liên kết</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "12px" }}>
                  <div><span style={{ color: "#9ca3af" }}>Mã YC: </span><span style={{ color: "#2563eb", fontWeight: 600 }}>{detail.linkedOrder.requestCode}</span></div>
                  <div><span style={{ color: "#9ca3af" }}>Shop: </span><span style={{ fontWeight: 500 }}>{detail.linkedOrder.shopName}</span></div>
                  <div><span style={{ color: "#9ca3af" }}>Trạng thái: </span><span style={{ fontWeight: 500 }}>{detail.linkedOrder.status}</span></div>
                  <div><span style={{ color: "#9ca3af" }}>COD: </span><span style={{ fontWeight: 500 }}>{(detail.linkedOrder.codAmount || 0).toLocaleString("vi-VN")}đ</span></div>
                </div>
                <a href={`/orders/${detail.linkedOrder.requestCode}`} style={{ fontSize: "12px", color: "#2563eb", fontWeight: 600, marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  Xem chi tiết đơn <ExternalLink size={11} />
                </a>
              </div>
            )}

            {/* Comments */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569", marginBottom: "10px" }}>💬 Ghi chú ({detail.comments?.length || 0})</div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment()} style={{ ...inputStyle, flex: 1 }} placeholder="Thêm ghi chú..." />
                <button onClick={addComment} disabled={sending} style={{ ...btnSecondary, color: "#2563eb", borderColor: "#bfdbfe", background: "#eff6ff" }}>
                  {sending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                </button>
              </div>
              {(detail.comments || []).map((c: any) => (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, color: "#1e293b" }}>{c.authorName}</span>
                    <span style={{ color: "#9ca3af" }}>{format(new Date(c.createdAt), "dd/MM HH:mm")}</span>
                  </div>
                  <div style={{ color: "#475569", marginTop: "4px" }}>{c.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {detail && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between" }}>
            <button onClick={handleDelete} style={{ ...btnSecondary, color: "#dc2626", borderColor: "#fecaca" }}><Trash2 size={14} /> Xóa</button>
            <button onClick={handleComplete} style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", border: "none",
              background: detail.status === "DONE" ? "#f59e0b" : "#16a34a", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}>
              {detail.status === "DONE" ? <><RotateCcw size={14} /> Mở lại</> : <><Check size={14} /> Hoàn thành</>}
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function TodosClient({ userId, userName, userRole }: { userId: string; userName: string; userRole: string }) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "kanban">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("todoView") as "list" | "kanban") || "list";
    return "list";
  });
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [hideDone, setHideDone] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<any>(null);

  // Quick add
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState("MEDIUM");
  const [quickAdding, setQuickAdding] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ search: "", source: "", priority: "", dueFilter: "" });

  // Reminder
  const reminderShown = useRef(false);
  const [reminder, setReminder] = useState<any>(null);

  const canViewAll = userRole === "ADMIN" || userRole === "MANAGER";

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        scope, page: String(pagination.page), pageSize: String(pagination.pageSize),
        hideDone: String(hideDone),
      });
      if (filters.search) params.set("search", filters.search);
      if (filters.source) params.set("source", filters.source);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.dueFilter) params.set("dueFilter", filters.dueFilter);
      const res = await fetch(`/api/todos?${params}`);
      const data = await res.json();
      setTodos(data.todos || []);
      setPagination(p => ({ ...p, ...data.pagination }));
    } finally { setLoading(false); }
  }, [scope, pagination.page, pagination.pageSize, hideDone, filters]);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/todos/stats");
    const data = await res.json();
    setStats(data);
  }, []);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Load reminder on page visit
  useEffect(() => {
    if (reminderShown.current) return;
    reminderShown.current = true;
    fetch("/api/todos/reminders").then(r => r.json()).then(data => {
      if ((data.overdue?.count || 0) > 0 || (data.dueToday?.count || 0) > 0) {
        setReminder(data);
      }
    }).catch(() => {});
  }, []);

  // Save view to localStorage
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("todoView", view); }, [view]);

  // Quick add
  const handleQuickAdd = async () => {
    if (!quickTitle.trim() || quickAdding) return;
    setQuickAdding(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: quickTitle.trim(), priority: quickPriority }),
      });
      if (res.ok) { setQuickTitle(""); fetchTodos(); fetchStats(); }
    } finally { setQuickAdding(false); }
  };

  // Toggle complete
  const handleToggleComplete = async (id: string) => {
    await fetch(`/api/todos/${id}/complete`, { method: "PATCH" });
    fetchTodos(); fetchStats();
  };

  // Quick status change
  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/todos/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchTodos(); fetchStats();
  };

  // Delete
  const handleDeleteTodo = async (id: string) => {
    if (!confirm("Xóa công việc này?")) return;
    await fetch(`/api/todos/${id}`, { method: "DELETE" });
    fetchTodos(); fetchStats();
  };

  // Update from detail panel
  const handleUpdateFromDetail = () => { fetchTodos(); fetchStats(); };
  const handleDeleteFromDetail = () => { fetchTodos(); fetchStats(); };

  // Kanban drag
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    const statusMap: Record<string, string> = { todo: "TODO", inprogress: "IN_PROGRESS", done: "DONE" };
    const newStatus = statusMap[destination.droppableId];

    // Optimistic update
    setTodos(prev => prev.map(t => t.id === draggableId ? { ...t, status: newStatus, completedAt: newStatus === "DONE" ? new Date().toISOString() : null } : t));

    await fetch("/api/todos/reorder", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: draggableId, status: newStatus, sortOrder: destination.index }] }),
    });
    fetchStats();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({ search: "", source: "", priority: "", dueFilter: "" });
    setPagination(p => ({ ...p, page: 1 }));
  };

  const scopeStats = stats ? (scope === "mine" ? stats.mine : stats.all) : null;

  const summaryCards = [
    { label: "Tổng việc hôm nay", value: scopeStats?.today || 0, color: "#2563eb", bg: "#eff6ff", icon: <ListTodo size={18} /> },
    { label: "Quá hạn", value: scopeStats?.overdue || 0, color: "#dc2626", bg: "#fef2f2", icon: <AlertTriangle size={18} />, clickFilter: "overdue" },
    { label: "Đang làm", value: scopeStats?.inProgress || 0, color: "#d97706", bg: "#fffbeb", icon: <Clock size={18} /> },
    { label: "Hoàn thành tuần này", value: scopeStats?.doneWeek || 0, color: "#16a34a", bg: "#f0fdf4", icon: <Check size={18} /> },
  ];

  // Kanban columns
  const todoItems = todos.filter(t => t.status === "TODO");
  const inProgressItems = todos.filter(t => t.status === "IN_PROGRESS");
  const doneItems = todos.filter(t => t.status === "DONE");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
      {/* Page title + controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", margin: 0 }}>Công Việc</h1>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0" }}>Quản lý và theo dõi công việc</p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {canViewAll && (
            <select value={scope} onChange={e => { setScope(e.target.value as any); setPagination(p => ({ ...p, page: 1 })); }} style={{ ...inputStyle, fontWeight: 600 }}>
              <option value="mine">Của tôi</option>
              <option value="all">Tất cả</option>
            </select>
          )}
          <div style={{ display: "flex", border: "1.5px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
            <button onClick={() => setView("list")} style={{ padding: "6px 12px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, background: view === "list" ? "#2563eb" : "#fff", color: view === "list" ? "#fff" : "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
              <ListTodo size={14} /> List
            </button>
            <button onClick={() => setView("kanban")} style={{ padding: "6px 12px", border: "none", borderLeft: "1px solid #e5e7eb", cursor: "pointer", fontSize: "12px", fontWeight: 600, background: view === "kanban" ? "#2563eb" : "#fff", color: view === "kanban" ? "#fff" : "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
              <Columns3 size={14} /> Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Quick add bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "6px 6px 6px 16px", border: "1.5px solid #e5e7eb", borderRadius: "10px",
        background: "#fff", transition: "border-color 0.2s",
      }}>
        <span style={{ fontSize: "16px" }}>📝</span>
        <input
          value={quickTitle}
          onChange={e => setQuickTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleQuickAdd()}
          placeholder="Thêm việc nhanh... (Enter để tạo)"
          style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", background: "transparent", color: "#1e293b" }}
        />
        <div style={{ display: "flex", gap: "4px", alignItems: "center", marginRight: "4px" }}>
          {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map(p => (
            <button
              key={p}
              onClick={() => setQuickPriority(p)}
              title={PRIORITY_CONFIG[p].label}
              style={{
                width: "14px", height: "14px", borderRadius: "50%", border: quickPriority === p ? `2px solid ${PRIORITY_CONFIG[p].dot}` : "1.5px solid #d1d5db",
                background: quickPriority === p ? PRIORITY_CONFIG[p].dot : "transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
            />
          ))}
        </div>
        {quickAdding && <Loader2 className="animate-spin" size={16} color="#6b7280" />}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {summaryCards.map((c, i) => (
          <button
            key={i}
            onClick={() => c.clickFilter ? setFilters(f => ({ ...f, dueFilter: c.clickFilter! })) : undefined}
            style={{
              background: c.bg, border: `0.5px solid ${c.color}20`, borderRadius: "10px",
              padding: "14px 16px", textAlign: "left", cursor: c.clickFilter ? "pointer" : "default",
              borderLeft: `3px solid ${c.color}`,
            }}
          >
            <div style={{ fontSize: "22px", fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginTop: "2px" }}>{c.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "0 0 200px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "9px", color: "#9ca3af" }} />
          <input style={{ ...inputStyle, paddingLeft: "32px", width: "100%" }} placeholder="Tìm kiếm..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <select style={inputStyle} value={filters.source} onChange={e => { setFilters(f => ({ ...f, source: e.target.value })); setPagination(p => ({ ...p, page: 1 })); }}>
          <option value="">Nguồn: Tất cả</option>
          {Object.entries(SOURCE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={inputStyle} value={filters.priority} onChange={e => { setFilters(f => ({ ...f, priority: e.target.value })); setPagination(p => ({ ...p, page: 1 })); }}>
          <option value="">Ưu tiên: Tất cả</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select style={inputStyle} value={filters.dueFilter} onChange={e => { setFilters(f => ({ ...f, dueFilter: e.target.value })); setPagination(p => ({ ...p, page: 1 })); }}>
          {DUE_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={resetFilters} style={btnSecondary}><RotateCcw size={12} /> Đặt lại</button>
        <label style={{ fontSize: "12px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px", marginLeft: "auto" }}>
          <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} /> Ẩn hoàn thành
        </label>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px", color: "#6b7280" }}><Loader2 className="animate-spin" size={24} /></div>
        ) : view === "list" ? (
          /* =============== LIST VIEW =============== */
          <div style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb" }}>
                  <th style={{ padding: "8px", width: "36px" }}>☐</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Tiêu Đề</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", width: "130px" }}>Mã Đơn</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", width: "90px" }}>Ưu Tiên</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", width: "110px" }}>Trạng Thái</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", width: "100px" }}>Thời Hạn</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", width: "110px" }}>Người PT</th>
                  <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", width: "90px" }}>Nguồn</th>
                  <th style={{ padding: "8px 10px", width: "70px" }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {todos.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>Chưa có công việc nào</td></tr>
                ) : todos.map((t, i) => {
                  const isDone = t.status === "DONE";
                  const overdue = !isDone && isDueOverdue(t.dueDate);
                  const today = !isDone && isDueToday(t.dueDate);
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f9fafb", opacity: isDone ? 0.5 : 1 }}>
                      <td style={{ padding: "8px", textAlign: "center" }}>
                        <input type="checkbox" checked={isDone} onChange={() => handleToggleComplete(t.id)} style={{ cursor: "pointer", width: "16px", height: "16px" }} />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span onClick={() => setSelectedTodo(t)} style={{ fontWeight: 600, color: "#1e293b", cursor: "pointer", textDecoration: isDone ? "line-through" : "none" }}>{t.title}</span>
                        {t._count?.comments > 0 && <span style={{ fontSize: "10px", color: "#9ca3af", marginLeft: "6px" }}>💬{t._count.comments}</span>}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        {t.linkedOrder ? (
                          <a href={`/orders/${t.linkedOrder.requestCode}`} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>{t.linkedOrder.requestCode}</a>
                        ) : <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", background: PRIORITY_CONFIG[t.priority]?.bg, color: PRIORITY_CONFIG[t.priority]?.color }}>{PRIORITY_CONFIG[t.priority]?.label}</span>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <select value={t.status} onChange={e => handleStatusChange(t.id, e.target.value)} style={{ fontSize: "11px", padding: "3px 6px", border: "1px solid #e5e7eb", borderRadius: "6px", background: STATUS_CONFIG[t.status]?.bg, color: STATUS_CONFIG[t.status]?.color, fontWeight: 600, cursor: "pointer" }}>
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "8px 10px", color: overdue ? "#dc2626" : today ? "#d97706" : "#475569", fontWeight: overdue || today ? 600 : 400 }}>
                        {t.dueDate ? formatDueDate(t.dueDate) : <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: 500, color: "#1e293b" }}>{t.assignee?.name || "—"}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", background: SOURCE_CONFIG[t.source]?.bg, color: SOURCE_CONFIG[t.source]?.color }}>{SOURCE_CONFIG[t.source]?.label}</span>
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button onClick={() => setSelectedTodo(t)} style={{ ...btnSecondary, padding: "3px 6px" }} title="Sửa"><Pencil size={12} /></button>
                          <button onClick={() => handleDeleteTodo(t.id)} style={{ ...btnSecondary, padding: "3px 6px", color: "#dc2626", borderColor: "#fecaca" }} title="Xóa"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: "1px solid #f1f5f9", fontSize: "12px", color: "#6b7280" }}>
                <span>Tổng: {pagination.total}</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} style={{ ...btnSecondary, opacity: pagination.page <= 1 ? 0.4 : 1 }}><ChevronLeft size={14} /></button>
                  <span style={{ fontWeight: 600 }}>{pagination.page}/{pagination.totalPages}</span>
                  <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} style={{ ...btnSecondary, opacity: pagination.page >= pagination.totalPages ? 0.4 : 1 }}><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* =============== KANBAN VIEW =============== */
          <DragDropContext onDragEnd={handleDragEnd}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", height: "100%" }}>
              {[
                { id: "todo", label: "Cần làm", items: todoItems, color: "#6b7280" },
                { id: "inprogress", label: "Đang làm", items: inProgressItems, color: "#d97706" },
                { id: "done", label: "Hoàn thành", items: doneItems.slice(0, 10), color: "#16a34a" },
              ].map(col => (
                <Droppable key={col.id} droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        background: snapshot.isDraggingOver ? "#f1f5f9" : "#f8fafc",
                        borderRadius: "12px", padding: "12px", minHeight: "200px",
                        border: `1px solid ${snapshot.isDraggingOver ? col.color + "40" : "#e5e7eb"}`,
                        transition: "background 0.2s, border-color 0.2s",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: 700, color: col.color, marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Circle size={8} fill={col.color} color={col.color} />
                        {col.label} ({col.items.length})
                      </div>
                      {col.items.map((t, idx) => (
                        <Draggable key={t.id} draggableId={t.id} index={idx}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              onClick={() => setSelectedTodo(t)}
                              style={{
                                ...prov.draggableProps.style,
                                background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "10px",
                                padding: "12px", marginBottom: "8px", cursor: "pointer",
                                boxShadow: snap.isDragging ? "0 4px 12px rgba(0,0,0,0.15)" : "0 1px 2px rgba(0,0,0,0.04)",
                                opacity: col.id === "done" ? 0.6 : 1,
                              }}
                            >
                              {/* Priority dot */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                  {t.title}
                                </div>
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: PRIORITY_CONFIG[t.priority]?.dot, flexShrink: 0, marginTop: "4px" }} />
                              </div>
                              {t.linkedOrder && (
                                <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: 500, marginBottom: "6px" }}>{t.linkedOrder.requestCode}</div>
                              )}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                  <span style={{ fontSize: "10px", fontWeight: 600, padding: "1px 6px", borderRadius: "4px", background: SOURCE_CONFIG[t.source]?.bg, color: SOURCE_CONFIG[t.source]?.color }}>{SOURCE_CONFIG[t.source]?.label}</span>
                                  {t.dueDate && (
                                    <span style={{ fontSize: "10px", color: isDueOverdue(t.dueDate) ? "#dc2626" : isDueToday(t.dueDate) ? "#d97706" : "#6b7280", fontWeight: 500, display: "flex", alignItems: "center", gap: "2px" }}>
                                      ⏰ {format(new Date(t.dueDate), "dd/MM HH:mm")}
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 500 }}>{t.assignee?.name?.split(" ").pop()}</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Detail panel */}
      {selectedTodo && (
        <TodoDetailPanel
          todo={selectedTodo}
          onClose={() => setSelectedTodo(null)}
          onUpdate={handleUpdateFromDetail}
          onDelete={handleDeleteFromDetail}
          userId={userId}
          userName={userName}
          userRole={userRole}
        />
      )}

      {/* Reminder popup */}
      {reminder && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 10060, background: "rgba(0,0,0,0.5)" }} onClick={() => setReminder(null)} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 10061, background: "#fff", borderRadius: "14px", border: "1.5px solid #2563EB",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)", width: "480px", maxWidth: "calc(100vw - 32px)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>⏰ Nhắc nhở công việc</div>
              <button onClick={() => setReminder(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px" }}>
              {reminder.overdue?.count > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#dc2626", marginBottom: "8px" }}>🔴 {reminder.overdue.count} công việc quá hạn</div>
                  {reminder.overdue.items.map((item: any) => (
                    <div key={item.id} style={{ fontSize: "12px", color: "#dc2626", padding: "4px 0 4px 16px" }}>• {item.title} (quá {item.daysOverdue} ngày)</div>
                  ))}
                  {reminder.overdue.count > 5 && <div style={{ fontSize: "11px", color: "#9ca3af", paddingLeft: "16px", marginTop: "4px" }}>+ {reminder.overdue.count - 5} công việc khác</div>}
                </div>
              )}
              {reminder.dueToday?.count > 0 && (
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#d97706", marginBottom: "8px" }}>🟡 {reminder.dueToday.count} công việc đến hạn hôm nay</div>
                  {reminder.dueToday.items.map((item: any) => (
                    <div key={item.id} style={{ fontSize: "12px", color: "#d97706", padding: "4px 0 4px 16px" }}>• {item.title} (hạn hôm nay)</div>
                  ))}
                  {reminder.dueToday.count > 5 && <div style={{ fontSize: "11px", color: "#9ca3af", paddingLeft: "16px", marginTop: "4px" }}>+ {reminder.dueToday.count - 5} công việc khác</div>}
                </div>
              )}
            </div>
            <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => setReminder(null)} style={btnSecondary}>Để sau</button>
              <button onClick={() => { setReminder(null); setFilters(f => ({ ...f, dueFilter: "overdue" })); }} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                Xem danh sách
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
