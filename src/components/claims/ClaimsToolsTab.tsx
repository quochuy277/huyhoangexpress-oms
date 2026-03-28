"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Link2, Upload, Trash2, Pencil, Download, Plus, X,
  Loader2, Check, GripVertical, ExternalLink, Clock, User,
  Search, Filter, ChevronLeft, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { CLAIMS_MOBILE_BREAKPOINT } from "@/components/claims/claims-table/claimsResponsive";

/* ============================================================
   STYLES
   ============================================================ */
const cardStyle: React.CSSProperties = {
  background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: "12px",
  padding: "16px", flex: 1, minWidth: 0,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", border: "1px solid #d1d5db",
  borderRadius: "8px", fontSize: "13px", outline: "none",
};
const btnPrimary: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
  borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff",
  fontSize: "13px", fontWeight: 600, cursor: "pointer",
};
const btnSecondary: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px",
  borderRadius: "8px", border: "1.5px solid #e5e7eb", background: "#fff",
  fontSize: "12px", fontWeight: 500, cursor: "pointer", color: "#374151",
};

const ACTION_COLORS: Record<string, string> = {
  "blue": "#3b82f6", "yellow": "#eab308", "green": "#16a34a", "red": "#dc2626",
};

const ACTION_FILTER_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "new", label: "Thêm mới" },
  { value: "status", label: "Chuyển trạng thái" },
  { value: "update", label: "Cập nhật" },
  { value: "compensation", label: "Đền bù" },
  { value: "complete", label: "Hoàn tất" },
  { value: "auto", label: "Tự động" },
];

/* ============================================================
   DIALOG COMPONENT
   ============================================================ */
function Dialog({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 10050, backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        zIndex: 10051, background: "#fff", borderRadius: "14px", border: "1.5px solid #2563EB",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)", width: "440px", maxWidth: "calc(100vw - 32px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px" }}>{children}</div>
      </div>
    </>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function ClaimsToolsTab({ isAdmin, onOpenClaim }: { isAdmin: boolean; onOpenClaim?: (claimId: string) => void }) {
  const queryClient = useQueryClient();

  // Dialog/form state
  const [uploadDialog, setUploadDialog] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkDialog, setLinkDialog] = useState<{ id?: string; title: string; url: string; description: string } | null>(null);
  const [linkSaving, setLinkSaving] = useState(false);

  // History pagination/filter state
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const [historyFilters, setHistoryFilters] = useState({ search: "", action: "", staff: "", dateFrom: "", dateTo: "" });

  // Documents — React Query
  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ["claims-documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      return res.json();
    },
  });
  const docs = docsData?.documents || [];

  // Links — React Query
  const { data: linksData, isLoading: linksLoading } = useQuery({
    queryKey: ["claims-links"],
    queryFn: async () => {
      const res = await fetch("/api/links");
      return res.json();
    },
  });
  const links = linksData?.links || [];

  // History — React Query with pagination/filter keys
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["claims-history", historyPage, historyPageSize, historyFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(historyPage),
        pageSize: String(historyPageSize),
      });
      if (historyFilters.search) params.set("search", historyFilters.search);
      if (historyFilters.action) params.set("action", historyFilters.action);
      if (historyFilters.staff) params.set("staff", historyFilters.staff);
      if (historyFilters.dateFrom) params.set("dateFrom", historyFilters.dateFrom);
      if (historyFilters.dateTo) params.set("dateTo", historyFilters.dateTo);
      const res = await fetch(`/api/claims/history?${params}`);
      return res.json();
    },
    placeholderData: (prev) => prev, // Keep previous data while loading
  });
  const activities = historyData?.activities || [];
  const staffNames = (historyData?.staffNames || []).map((s: any) => s.name).filter(Boolean);
  const historyPagination = { page: historyPage, pageSize: historyPageSize, total: historyData?.pagination?.total || 0, totalPages: historyData?.pagination?.totalPages || 0 };

  // Upload document
  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    if (!formData.get("name") || !formData.get("file")) return;
    setUploading(true);
    try {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (res.ok) { setUploadDialog(false); queryClient.invalidateQueries({ queryKey: ["claims-documents"] }); }
    } finally { setUploading(false); }
  };

  // Rename document
  const handleRename = async () => {
    if (!renameDialog) return;
    await fetch(`/api/documents/${renameDialog.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameDialog.name }),
    });
    setRenameDialog(null);
    queryClient.invalidateQueries({ queryKey: ["claims-documents"] });
  };

  // Delete document
  const handleDeleteDoc = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa tài liệu '${name}'?`)) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["claims-documents"] });
  };

  // Save link (create or update)
  const handleSaveLink = async () => {
    if (!linkDialog || !linkDialog.title || !linkDialog.url) return;
    setLinkSaving(true);
    try {
      if (linkDialog.id) {
        await fetch(`/api/links/${linkDialog.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: linkDialog.title, url: linkDialog.url, description: linkDialog.description }),
        });
      } else {
        await fetch("/api/links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: linkDialog.title, url: linkDialog.url, description: linkDialog.description }),
        });
      }
      setLinkDialog(null);
      queryClient.invalidateQueries({ queryKey: ["claims-links"] });
    } finally { setLinkSaving(false); }
  };

  // Delete link
  const handleDeleteLink = async (id: string, title: string) => {
    if (!confirm(`Bạn có chắc muốn xóa đường dẫn '${title}'?`)) return;
    await fetch(`/api/links/${id}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["claims-links"] });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="claims-tools-tab" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <style>{`
        @media (max-width: ${CLAIMS_MOBILE_BREAKPOINT - 1}px) {
          .claims-tools-cards { flex-direction: column !important; }
          .claims-tools-cards > div { min-width: 0 !important; }
          .claims-tools-doc-row { flex-wrap: wrap !important; gap: 8px !important; }
          .claims-tools-doc-actions { width: 100% !important; justify-content: flex-end !important; margin-top: 4px !important; }
          .claims-tools-filters { gap: 6px !important; }
          .claims-tools-filters > * { flex: 1 1 100% !important; min-width: 0 !important; }
          .claims-tools-history-table { display: none !important; }
          .claims-tools-history-cards { display: flex !important; }
          .claims-tools-pagination { flex-direction: column !important; gap: 8px !important; align-items: stretch !important; }
          .claims-tools-pagination > div { justify-content: center !important; }
          .claims-tools-header-btn span.btn-label { display: none !important; }
          .claims-tools-link-admin { flex-wrap: wrap !important; }
        }
      `}</style>

      {/* Section A: Tài liệu & Đường dẫn */}
      <div className="claims-tools-cards" style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {/* Card 1: Tài liệu */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
              <FileText size={18} color="#2563EB" /> Tài liệu
            </div>
            {isAdmin && (
              <button onClick={() => setUploadDialog(true)} style={btnPrimary} className="claims-tools-header-btn">
                <Upload size={14} /> <span className="btn-label">Tải lên tài liệu</span>
              </button>
            )}
          </div>
          {docsLoading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}><Loader2 className="animate-spin inline" size={20} /></div>
          ) : docs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#9ca3af", fontSize: "13px" }}>Chưa có tài liệu nào</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {docs.map((doc: any, i: number) => (
                <div key={doc.id} className="claims-tools-doc-row" style={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px",
                  borderRadius: "8px", transition: "background 0.15s",
                  background: i % 2 === 0 ? "#f9fafb" : "#fff",
                }}>
                  <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, minWidth: "20px" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                    <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                      {format(new Date(doc.createdAt), "dd/MM/yyyy")} · {formatFileSize(doc.fileSize)} · {doc.uploadedBy}
                    </div>
                  </div>
                  <div className="claims-tools-doc-actions" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      style={{ ...btnSecondary, textDecoration: "none", color: "#2563EB", borderColor: "#bfdbfe", background: "#eff6ff", padding: "5px 10px" }}
                    >
                      <Download size={12} /> Tải về
                    </a>
                    {isAdmin && (
                      <>
                        <button onClick={() => setRenameDialog({ id: doc.id, name: doc.name })} style={{ ...btnSecondary, padding: "5px 8px" }} title="Đổi tên">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDeleteDoc(doc.id, doc.name)} style={{ ...btnSecondary, padding: "5px 8px", color: "#dc2626", borderColor: "#fecaca" }} title="Xóa">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 2: Đường dẫn quan trọng */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
              <Link2 size={18} color="#2563EB" /> Đường dẫn quan trọng
            </div>
            {isAdmin && (
              <button onClick={() => setLinkDialog({ title: "", url: "", description: "" })} style={btnPrimary} className="claims-tools-header-btn">
                <Plus size={14} /> <span className="btn-label">Thêm đường dẫn</span>
              </button>
            )}
          </div>
          {linksLoading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}><Loader2 className="animate-spin inline" size={20} /></div>
          ) : links.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#9ca3af", fontSize: "13px" }}>Chưa có đường dẫn nào</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              {links.map((link: any, i: number) => (
                <div key={link.id} style={{
                  display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 12px",
                  borderRadius: "8px", background: i % 2 === 0 ? "#f9fafb" : "#fff",
                }}>
                  <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: 600, minWidth: "20px", marginTop: "2px" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "13px", fontWeight: 600, color: "#2563EB", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      {link.title} <ExternalLink size={11} style={{ opacity: 0.5 }} />
                    </a>
                    {link.description && (
                      <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>{link.description}</div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="claims-tools-link-admin" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <button onClick={() => setLinkDialog({ id: link.id, title: link.title, url: link.url, description: link.description || "" })} style={{ ...btnSecondary, padding: "5px 8px" }} title="Sửa">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDeleteLink(link.id, link.title)} style={{ ...btnSecondary, padding: "5px 8px", color: "#dc2626", borderColor: "#fecaca" }} title="Xóa">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section B: Lịch sử xử lý */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
            <Clock size={18} color="#2563EB" /> Lịch sử xử lý
          </div>
        </div>

        {/* Filters */}
        <div className="claims-tools-filters" style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "0 0 200px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "9px", color: "#9ca3af" }} />
            <input
              style={{ ...inputStyle, paddingLeft: "32px", padding: "7px 10px 7px 32px" }}
              placeholder="Mã đơn, Nhân viên..."
              value={historyFilters.search}
              onChange={e => {
                setHistoryFilters(f => ({ ...f, search: e.target.value }));
                setHistoryPage(1);
              }}
              aria-label="Tìm kiếm lịch sử claims"
            />
          </div>
          <select
            style={{ ...inputStyle, width: "auto", padding: "7px 10px" }}
            value={historyFilters.action}
            onChange={e => { setHistoryFilters(f => ({ ...f, action: e.target.value })); setHistoryPage(1); }}
            aria-label="Lọc hành động claims"
          >
            {ACTION_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            style={{ ...inputStyle, width: "auto", padding: "7px 10px" }}
            value={historyFilters.staff}
            onChange={e => { setHistoryFilters(f => ({ ...f, staff: e.target.value })); setHistoryPage(1); }}
            aria-label="Lọc nhân viên claims"
          >
            <option value="">Tất cả NV</option>
            {staffNames.map((n: string) => <option key={n} value={n}>{n}</option>)}
          </select>
          <input
            type="date"
            style={{ ...inputStyle, width: "auto", padding: "7px 10px" }}
            value={historyFilters.dateFrom}
            onChange={e => {
              setHistoryFilters(f => ({ ...f, dateFrom: e.target.value }));
              setHistoryPage(1);
            }}
            placeholder="Từ ngày"
            aria-label="Từ ngày lịch sử claims"
          />
          <input
            type="date"
            style={{ ...inputStyle, width: "auto", padding: "7px 10px" }}
            value={historyFilters.dateTo}
            onChange={e => {
              setHistoryFilters(f => ({ ...f, dateTo: e.target.value }));
              setHistoryPage(1);
            }}
            placeholder="Đến ngày"
            aria-label="Đến ngày lịch sử claims"
          />
        </div>

        {/* Desktop Table */}
        <div className="claims-tools-history-table" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", width: "140px" }}>Thời Gian</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", width: "130px" }}>Nhân Viên</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", width: "130px" }}>Mã Đơn</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", width: "160px" }}>Hành Động</th>
                <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569" }}>Chi Tiết</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}><Loader2 className="animate-spin inline" size={18} /></td></tr>
              ) : activities.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "#9ca3af" }}>Chưa có lịch sử xử lý</td></tr>
              ) : activities.map((a: any, i: number) => (
                <tr key={a.id + i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td style={{ padding: "8px 10px", color: "#475569", whiteSpace: "nowrap" }}>
                    {a.timestamp ? format(new Date(a.timestamp), "dd/MM/yyyy HH:mm") : "—"}
                  </td>
                  <td style={{ padding: "8px 10px", color: "#1e293b", fontWeight: 500 }}>{a.staff || "—"}</td>
                  <td style={{ padding: "8px 10px" }}>
                    {a.claimId && onOpenClaim ? (
                      <button
                        onClick={() => onOpenClaim(a.claimId)}
                        style={{ background: "none", border: "none", padding: 0, color: "#2563EB", fontWeight: 600, cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}
                      >
                        {a.requestCode || "—"}
                      </button>
                    ) : (
                      <span style={{ color: "#2563EB", fontWeight: 600 }}>{a.requestCode || "—"}</span>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span style={{
                        width: "7px", height: "7px", borderRadius: "50%",
                        background: ACTION_COLORS[a.dotColor] || "#6b7280", flexShrink: 0,
                      }} />
                      <span style={{ fontWeight: 500, color: "#1e293b" }}>{a.action || "—"}</span>
                    </span>
                  </td>
                  <td style={{ padding: "8px 10px", color: "#6b7280", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.detail || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (shown only on mobile) */}
        <div className="claims-tools-history-cards" style={{ display: "none", flexDirection: "column", gap: "8px" }}>
          {historyLoading ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#6b7280" }}><Loader2 className="animate-spin inline" size={18} /></div>
          ) : activities.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#9ca3af" }}>Chưa có lịch sử xử lý</div>
          ) : activities.map((a: any, i: number) => (
            <div key={a.id + i} style={{
              padding: "12px", borderRadius: "10px", background: i % 2 === 0 ? "#fff" : "#f9fafb",
              border: "1px solid #f1f5f9",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span style={{
                    width: "7px", height: "7px", borderRadius: "50%",
                    background: ACTION_COLORS[a.dotColor] || "#6b7280", flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "12px" }}>{a.action || "—"}</span>
                </span>
                <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                  {a.timestamp ? format(new Date(a.timestamp), "dd/MM HH:mm") : "—"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                {a.claimId && onOpenClaim ? (
                  <button
                    onClick={() => onOpenClaim(a.claimId)}
                    style={{ background: "none", border: "none", padding: 0, color: "#2563EB", fontWeight: 600, cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}
                  >
                    {a.requestCode || "—"}
                  </button>
                ) : (
                  <span style={{ color: "#2563EB", fontWeight: 600, fontSize: "12px" }}>{a.requestCode || "—"}</span>
                )}
                <span style={{ fontSize: "11px", color: "#6b7280" }}>{a.staff || "—"}</span>
              </div>
              {a.detail && (
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px", lineHeight: "1.4", wordBreak: "break-word" }}>
                  {a.detail}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {historyPagination.totalPages > 0 && (
          <div className="claims-tools-pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "12px", color: "#6b7280" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>Hiển thị</span>
              <select
                value={historyPagination.pageSize}
                onChange={e => {
                  setHistoryPageSize(Number(e.target.value));
                  setHistoryPage(1);
                }}
                style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "4px 8px", fontSize: "12px" }}
                aria-label="Số dòng lịch sử mỗi trang"
              >
                {[20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>/ {historyPagination.total} mục</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPagination.page <= 1}
                style={{ ...btnSecondary, opacity: historyPagination.page <= 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={14} /> Trước
              </button>
              <span style={{ fontWeight: 600 }}>{historyPagination.page} / {historyPagination.totalPages}</span>
              <button
                onClick={() => setHistoryPage(p => Math.min(historyPagination.totalPages, p + 1))}
                disabled={historyPagination.page >= historyPagination.totalPages}
                style={{ ...btnSecondary, opacity: historyPagination.page >= historyPagination.totalPages ? 0.4 : 1 }}
              >
                Sau <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} title="Tải lên tài liệu">
        <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Tên tài liệu *</label>
            <input name="name" style={inputStyle} placeholder="VD: Quy trình xử lý khiếu nại v2" required />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Chọn file *</label>
            <input name="file" type="file" accept=".docx,.pdf,.xlsx,.xls,.doc" required style={{ fontSize: "13px" }} />
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button type="button" onClick={() => setUploadDialog(false)} style={btnSecondary}>Hủy</button>
            <button type="submit" disabled={uploading} style={{ ...btnPrimary, opacity: uploading ? 0.7 : 1 }}>
              {uploading && <Loader2 className="animate-spin" size={14} />}
              Tải lên
            </button>
          </div>
        </form>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onClose={() => setRenameDialog(null)} title="Đổi tên tài liệu">
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Tên mới</label>
            <input
              style={inputStyle}
              value={renameDialog?.name || ""}
              onChange={e => setRenameDialog(prev => prev ? { ...prev, name: e.target.value } : null)}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => setRenameDialog(null)} style={btnSecondary}>Hủy</button>
            <button onClick={handleRename} style={btnPrimary}><Check size={14} /> Lưu</button>
          </div>
        </div>
      </Dialog>

      {/* Link Dialog (Create / Edit) */}
      <Dialog open={!!linkDialog} onClose={() => setLinkDialog(null)} title={linkDialog?.id ? "Sửa đường dẫn" : "Thêm đường dẫn"}>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Tiêu đề *</label>
            <input
              style={inputStyle}
              placeholder="VD: Tra cứu đơn GHN"
              value={linkDialog?.title || ""}
              onChange={e => setLinkDialog(prev => prev ? { ...prev, title: e.target.value } : null)}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>URL *</label>
            <input
              style={inputStyle}
              placeholder="https://..."
              value={linkDialog?.url || ""}
              onChange={e => setLinkDialog(prev => prev ? { ...prev, url: e.target.value } : null)}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>Mô tả</label>
            <input
              style={inputStyle}
              placeholder="Mô tả ngắn (tùy chọn)"
              value={linkDialog?.description || ""}
              onChange={e => setLinkDialog(prev => prev ? { ...prev, description: e.target.value } : null)}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button onClick={() => setLinkDialog(null)} style={btnSecondary}>Hủy</button>
            <button onClick={handleSaveLink} disabled={linkSaving} style={{ ...btnPrimary, opacity: linkSaving ? 0.7 : 1 }}>
              {linkSaving && <Loader2 className="animate-spin" size={14} />}
              Lưu
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
