"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckSquare, Loader2, X } from "lucide-react";

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
  const [users, setUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [resolvedRole, setResolvedRole] = useState(userRole || "");

  const canAssign = resolvedRole === "ADMIN" || resolvedRole === "MANAGER";

  useEffect(() => {
    setMounted(true);

    // Auto-detect role if not provided, then fetch users if admin/manager
    const init = async () => {
      let role = userRole || "";
      if (!role) {
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            role = data.role || "";
            setResolvedRole(role);
          }
        } catch { /* ignore */ }
      }
      if (role === "ADMIN" || role === "MANAGER") {
        try {
          const res = await fetch("/api/todos/users");
          const data = await res.json();
          setUsers(data.users || []);
        } catch { /* ignore */ }
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset fields when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle);
      setDescription(defaultDescription);
      setPriority(defaultPriority);
      setDueDate("");
      setAssigneeId("");
      setToast(null);
    }
  }, [open, defaultTitle, defaultDescription, defaultPriority]);

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
        setTimeout(() => {
          onClose();
          setToast(null);
        }, 1200);
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

  if (!open || !mounted) return null;

  const dialog = (
    <>
      {/* Dark backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      />

      {/* Dialog container */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "480px",
          maxWidth: "calc(100vw - 32px)",
          background: "#FFFFFF",
          border: "1.5px solid #2563EB",
          borderRadius: "12px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          padding: "24px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e5e7eb",
            paddingBottom: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckSquare style={{ width: "20px", height: "20px", color: "#2563EB" }} />
            <span style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a" }}>
              Thêm vào Công Việc
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              color: "#666",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s, background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#1a1a1a";
              e.currentTarget.style.background = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#666";
              e.currentTarget.style.background = "none";
            }}
          >
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        {/* Form fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Field 1: Tiêu đề */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
              Tiêu đề công việc <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề..."
              style={{
                width: "100%",
                background: "#FFFFFF",
                border: "1.5px solid #d1d5db",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "14px",
                color: "#1a1a1a",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#2563EB";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Field 2: Mô tả */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
              Mô tả
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết..."
              rows={3}
              style={{
                width: "100%",
                background: "#FFFFFF",
                border: "1.5px solid #d1d5db",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "14px",
                color: "#1a1a1a",
                outline: "none",
                resize: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#2563EB";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Field 3: Mức ưu tiên */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
              Mức ưu tiên
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              style={{
                width: "100%",
                background: "#FFFFFF",
                border: "1.5px solid #d1d5db",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "14px",
                color: "#1a1a1a",
                outline: "none",
                boxSizing: "border-box",
                cursor: "pointer",
                appearance: "auto",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#2563EB";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <option value="LOW">Thấp</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="HIGH">Cao</option>
              <option value="URGENT">Khẩn cấp</option>
            </select>
          </div>

          {/* Field 4: Thời hạn */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
              Thời hạn
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                width: "100%",
                background: "#FFFFFF",
                border: "1.5px solid #d1d5db",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "14px",
                color: "#1a1a1a",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#2563EB";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#d1d5db";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Field 5: Gán nhân viên (Admin/Manager only) */}
          {canAssign && users.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                Gán cho nhân viên
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                style={{
                  width: "100%",
                  background: "#FFFFFF",
                  border: "1.5px solid #d1d5db",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  fontSize: "14px",
                  color: "#1a1a1a",
                  outline: "none",
                  boxSizing: "border-box" as const,
                  cursor: "pointer",
                  appearance: "auto" as const,
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#2563EB";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#d1d5db";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <option value="">Tôi (mặc định)</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>
          )}

          {/* Toast */}
          {toast && (
            <div
              style={{
                fontSize: "13px",
                padding: "10px 14px",
                borderRadius: "8px",
                fontWeight: 500,
                background: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
                color: toast.type === "success" ? "#16a34a" : "#dc2626",
                border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
              }}
            >
              {toast.type === "success" ? "✅ " : "❌ "}
              {toast.msg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "24px",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "16px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #d1d5db",
              color: "#374151",
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            style={{
              background: "#2563EB",
              color: "#FFFFFF",
              border: "none",
              padding: "8px 20px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: isSubmitting || !title.trim() ? "not-allowed" : "pointer",
              opacity: isSubmitting || !title.trim() ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting && title.trim()) e.currentTarget.style.background = "#1d4ed8";
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#2563EB")}
          >
            {isSubmitting && <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite" }} />}
            {isSubmitting ? "Đang tạo..." : "Tạo công việc"}
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(dialog, document.body);
}
