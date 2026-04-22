"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Loader2, X, Pin, Paperclip, Bold, Italic, Type, Palette, Eye } from "lucide-react";
import { sanitizeHtml, stripHtml } from "@/lib/sanitize";

/* ============================================================
   Shared styles
   ============================================================ */
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "rgba(0,0,0,0.5)",
};
const dialogBase: React.CSSProperties = {
  position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999,
  maxWidth: "calc(100vw - 32px)", background: "#FFFFFF", border: "1.5px solid #2563EB",
  borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: "24px",
  display: "flex", flexDirection: "column",
};
const headerStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  borderBottom: "1px solid #e5e7eb", paddingBottom: "16px", marginBottom: "20px",
};
const titleStyle: React.CSSProperties = { fontSize: "18px", fontWeight: 600, color: "#1a1a1a" };
const closeBtnBase: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px",
  color: "#666", display: "flex", alignItems: "center", justifyContent: "center",
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "#FFFFFF", border: "1.5px solid #d1d5db", borderRadius: "8px",
  padding: "10px 12px", fontSize: "14px", color: "#1a1a1a", outline: "none", boxSizing: "border-box",
};
const footerStyle: React.CSSProperties = {
  display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px",
  borderTop: "1px solid #e5e7eb", paddingTop: "16px",
};
const cancelBtnStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid #d1d5db", color: "#374151",
  padding: "8px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer",
};
const primaryBtnStyle: React.CSSProperties = {
  background: "#2563EB", color: "#FFFFFF", border: "none", padding: "8px 20px",
  borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer",
  display: "flex", alignItems: "center", gap: "6px",
};

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  isPinned: boolean;
  createdByName: string;
  createdAt: string;
  readCount: number;
}

export function AnnouncementSection() {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [previewItem, setPreviewItem] = useState<AnnouncementItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<AnnouncementItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/announcements?pageSize=50");
      if (res.ok) {
        const data = await res.json();
        setItems(data.announcements || []);
      }
    } catch (err) { console.warn("[AnnouncementSection] Failed to fetch announcements:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id: string) => {
    // Optimistic delete (Sprint 2, 2026-04): remove the row from the local
    // list before firing the DELETE so the admin sees the row disappear
    // instantly. On failure we re-insert the row at its original index.
    const snapshot = items;
    const index = snapshot.findIndex((item) => item.id === id);
    if (index !== -1) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
    setDeleteItem(null);

    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (res.ok) {
        // Re-sync in the background to pick up any concurrent admin edits.
        void fetchItems();
      } else if (index !== -1) {
        setItems((prev) => {
          const next = [...prev];
          next.splice(index, 0, snapshot[index]);
          return next;
        });
      }
    } catch (err) {
      if (index !== -1) {
        setItems((prev) => {
          const next = [...prev];
          next.splice(index, 0, snapshot[index]);
          return next;
        });
      }
      console.warn("[AnnouncementSection] Failed to delete announcement:", err);
    }
  };

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>{items.length} thông báo</p>
        <button
          onClick={() => setShowCreate(true)}
          style={{ ...primaryBtnStyle, padding: "8px 18px" }}
          onMouseEnter={e => e.currentTarget.style.background = "#1d4ed8"}
          onMouseLeave={e => e.currentTarget.style.background = "#2563EB"}
        >
          <Plus className="w-4 h-4" /> Tạo thông báo
        </button>
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center" }}>
            <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#9ca3af" }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
            Chưa có thông báo nào
          </div>
        ) : (
          items.map((item, i) => (
            <div key={item.id} style={{
              padding: "16px 20px", borderBottom: i < items.length - 1 ? "1px solid #f3f4f6" : "none",
              display: "flex", alignItems: "flex-start", gap: "12px",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  {item.isPinned && (
                    <Pin style={{ width: "12px", height: "12px", color: "#d97706", transform: "rotate(45deg)" }} />
                  )}
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>{item.title}</span>
                  {item.attachmentName && (
                    <Paperclip style={{ width: "12px", height: "12px", color: "#9ca3af" }} />
                  )}
                </div>
                <div
                  style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5, maxHeight: "40px", overflow: "hidden" }}
                >
                  {stripHtml(item.content).substring(0, 150)}
                </div>
                <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                    {new Date(item.createdAt).toLocaleDateString("vi-VN")} • {item.createdByName}
                  </span>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                    {item.readCount} đã đọc
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                <button onClick={() => setPreviewItem(item)} style={{
                  padding: "5px", borderRadius: "6px", border: "none", background: "transparent",
                  cursor: "pointer", color: "#2563EB",
                }} title="Xem">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteItem(item)} style={{
                  padding: "5px", borderRadius: "6px", border: "none", background: "transparent",
                  cursor: "pointer", color: "#dc2626",
                }} title="Xóa">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && <CreateAnnouncementDialog onClose={() => setShowCreate(false)} onCreated={fetchItems} />}

      {/* Preview Dialog */}
      {previewItem && createPortal(
        <>
          <div onClick={() => setPreviewItem(null)} style={overlayStyle} />
          <div style={{ ...dialogBase, width: "600px", maxHeight: "80vh" }}>
            <div style={headerStyle}>
              <span style={titleStyle}>{previewItem.title}</span>
              <button onClick={() => setPreviewItem(null)} style={closeBtnBase}><X style={{ width: "18px", height: "18px" }} /></button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, maxHeight: "calc(80vh - 150px)" }}>
              <div style={{ fontSize: "14px", lineHeight: 1.7, color: "#374151" }} dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewItem.content) }} />
              {previewItem.attachmentUrl && (
                <div style={{ marginTop: "16px", padding: "10px 14px", background: "#f9fafb", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Paperclip style={{ width: "14px", height: "14px", color: "#6b7280" }} />
                  <a href={previewItem.attachmentUrl} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "#2563EB", textDecoration: "underline" }}>
                    {previewItem.attachmentName || "Tải file đính kèm"}
                  </a>
                </div>
              )}
            </div>
            <div style={{ marginTop: "16px", fontSize: "12px", color: "#9ca3af" }}>
              Đăng bởi {previewItem.createdByName} • {new Date(previewItem.createdAt).toLocaleString("vi-VN")}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Delete Confirm Dialog */}
      {deleteItem && createPortal(
        <>
          <div onClick={() => setDeleteItem(null)} style={overlayStyle} />
          <div style={{ ...dialogBase, width: "420px" }}>
            <div style={headerStyle}>
              <span style={{ ...titleStyle, color: "#dc2626" }}>Xóa thông báo</span>
              <button onClick={() => setDeleteItem(null)} style={closeBtnBase}><X style={{ width: "18px", height: "18px" }} /></button>
            </div>
            <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
              Bạn có chắc muốn xóa thông báo <b>&quot;{deleteItem.title}&quot;</b>?
            </p>
            <div style={footerStyle}>
              <button onClick={() => setDeleteItem(null)} style={cancelBtnStyle}>Hủy</button>
              <button onClick={() => handleDelete(deleteItem.id)} style={{ ...primaryBtnStyle, background: "#dc2626" }}>Xóa</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

/* ============================================================
   Create Announcement Dialog with Rich Text Toolbar
   ============================================================ */
function CreateAnnouncementDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editorId = "announcement-editor";

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    document.getElementById(editorId)?.focus();
  };

  const handleSubmit = async () => {
    const editorEl = document.getElementById(editorId);
    const content = editorEl?.innerHTML || "";
    if (!title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
    if (!content.trim() || content === "<br>") { setError("Vui lòng nhập nội dung"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), content,
          attachmentUrl: attachmentUrl.trim() || null,
          attachmentName: attachmentName.trim() || null,
          isPinned,
        }),
      });
      if (res.ok) { onCreated(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setError(d.error || "Lỗi"); }
    } catch { setError("Lỗi kết nối"); }
    finally { setSaving(false); }
  };

  const FONT_COLORS = ["#1a1a1a", "#dc2626", "#2563EB", "#16a34a", "#d97706", "#7c3aed"];
  const FONT_SIZES = [
    { label: "Nhỏ", value: "2" },
    { label: "Thường", value: "3" },
    { label: "Lớn", value: "4" },
    { label: "Rất lớn", value: "5" },
  ];

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "640px", maxHeight: "85vh" }}>
        <div style={headerStyle}>
          <span style={titleStyle}>Tạo thông báo mới</span>
          <button onClick={onClose} style={closeBtnBase}><X style={{ width: "18px", height: "18px" }} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", flex: 1, maxHeight: "calc(85vh - 200px)" }}>
          {/* Title */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
              Tiêu đề <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề thông báo..." />
          </div>

          {/* Rich text editor */}
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
              Nội dung <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {/* Toolbar */}
            <div style={{
              display: "flex", gap: "2px", flexWrap: "wrap", padding: "6px 8px",
              background: "#f9fafb", border: "1.5px solid #d1d5db", borderBottom: "none",
              borderRadius: "8px 8px 0 0", alignItems: "center",
            }}>
              <button type="button" onClick={() => execCmd("bold")} style={{ padding: "4px 8px", border: "none", background: "transparent", cursor: "pointer", borderRadius: "4px" }} title="Đậm"
                onMouseEnter={e => e.currentTarget.style.background = "#e5e7eb"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Bold style={{ width: "14px", height: "14px" }} />
              </button>
              <button type="button" onClick={() => execCmd("italic")} style={{ padding: "4px 8px", border: "none", background: "transparent", cursor: "pointer", borderRadius: "4px" }} title="Nghiêng"
                onMouseEnter={e => e.currentTarget.style.background = "#e5e7eb"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Italic style={{ width: "14px", height: "14px" }} />
              </button>

              <div style={{ width: "1px", height: "20px", background: "#d1d5db", margin: "0 4px" }} />

              {/* Font size */}
              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <Type style={{ width: "12px", height: "12px", color: "#6b7280" }} />
                <select
                  onChange={e => execCmd("fontSize", e.target.value)}
                  defaultValue="3"
                  style={{ fontSize: "11px", border: "1px solid #d1d5db", borderRadius: "4px", padding: "2px 4px", cursor: "pointer", background: "#fff" }}
                >
                  {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>

              <div style={{ width: "1px", height: "20px", background: "#d1d5db", margin: "0 4px" }} />

              {/* Font color */}
              <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <Palette style={{ width: "12px", height: "12px", color: "#6b7280" }} />
                {FONT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => execCmd("foreColor", c)}
                    style={{ width: "18px", height: "18px", borderRadius: "50%", border: "1.5px solid #d1d5db", background: c, cursor: "pointer" }}
                    title={c} />
                ))}
              </div>
            </div>
            {/* Editor area */}
            <div
              id={editorId}
              contentEditable
              style={{
                ...inputStyle,
                minHeight: "150px",
                borderRadius: "0 0 8px 8px",
                borderTop: "1px solid #e5e7eb",
                lineHeight: 1.7,
                overflow: "auto",
                maxHeight: "300px",
              }}
              suppressContentEditableWarning
            />
          </div>

          {/* Attachment */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }} className="resp-grid-1-2">
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                <Paperclip style={{ width: "12px", height: "12px", display: "inline", marginRight: "4px" }} />
                URL đính kèm
              </label>
              <input style={inputStyle} value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Tên file</label>
              <input style={inputStyle} value={attachmentName} onChange={e => setAttachmentName(e.target.value)} placeholder="Tên file hiển thị..." />
            </div>
          </div>

          {/* Pin toggle */}
          <div
            onClick={() => setIsPinned(!isPinned)}
            style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "8px 0" }}
          >
            <button type="button" role="switch" aria-checked={isPinned}
              style={{
                position: "relative", display: "inline-flex", height: "22px", width: "40px",
                alignItems: "center", borderRadius: "11px", border: "none", cursor: "pointer",
                background: isPinned ? "#d97706" : "#d1d5db", flexShrink: 0,
              }}>
              <span style={{
                display: "inline-block", height: "16px", width: "16px", borderRadius: "50%",
                background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                transform: isPinned ? "translateX(18px)" : "translateX(3px)", transition: "transform 0.2s",
              }} />
            </button>
            <span style={{ fontSize: "13px", color: "#374151" }}>
              <Pin style={{ width: "12px", height: "12px", display: "inline", marginRight: "4px", transform: "rotate(45deg)" }} />
              Ghim thông báo (hiển thị đầu tiên)
            </span>
          </div>

          {error && <p style={{ fontSize: "13px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px" }}>{error}</p>}
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle}>Hủy</button>
          <button onClick={handleSubmit} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1 }}>
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {saving ? "Đang gửi..." : "Đăng thông báo"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
