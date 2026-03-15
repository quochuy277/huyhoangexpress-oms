"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search, Plus, Download, X, ChevronLeft, ChevronRight,
  AlertTriangle, Eye, CheckSquare, Check, Loader2,
  FileText, Clock, Ban, Zap, HelpCircle, Package, ShieldAlert,
  ChevronDown, Calendar, RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

/* ============================================================
   CONSTANTS & HELPERS
   ============================================================ */

const ISSUE_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  SLOW_JOURNEY: { label: "Hành trình chậm", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  SUSPICIOUS: { label: "Nghi ngờ", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  LOST: { label: "Thất lạc", bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  DAMAGED: { label: "Hư hỏng", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  OTHER: { label: "Vấn đề khác", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-200" },
};

const CLAIM_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Chưa xử lý", bg: "bg-gray-100", text: "text-gray-700" },
  VERIFYING_CARRIER: { label: "Đang xác minh", bg: "bg-blue-100", text: "text-blue-700" },
  CLAIM_SUBMITTED: { label: "Đã gửi KN", bg: "bg-indigo-100", text: "text-indigo-700" },
  COMPENSATION_REQUESTED: { label: "Đã yêu cầu ĐB", bg: "bg-purple-100", text: "text-purple-700" },
  RESOLVED: { label: "Đã xử lý ✓", bg: "bg-green-100", text: "text-green-700" },
  CARRIER_COMPENSATED: { label: "NVC đã đền bù", bg: "bg-teal-100", text: "text-teal-700" },
  CARRIER_REJECTED: { label: "NVC từ chối", bg: "bg-red-100", text: "text-red-700" },
  CUSTOMER_COMPENSATED: { label: "Đã đền bù KH ✓", bg: "bg-green-100", text: "text-green-700" },
  CUSTOMER_REJECTED: { label: "Từ chối ĐB KH ✓", bg: "bg-orange-100", text: "text-orange-700" },
};

const COMPLETION_STATUSES = ["RESOLVED", "CUSTOMER_COMPENSATED", "CUSTOMER_REJECTED"];

const CARRIER_COMP_EDITABLE = ["CARRIER_COMPENSATED"];
const CUSTOMER_COMP_EDITABLE = ["CARRIER_COMPENSATED", "CARRIER_REJECTED", "CUSTOMER_COMPENSATED"];

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function daysBetween(d: string | Date) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function daysUntil(d: string | Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

/* ============================================================
   STYLES — matching admin dialog / upload history patterns
   ============================================================ */
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "rgba(0,0,0,0.5)",
};
const dialogBase: React.CSSProperties = {
  position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
  zIndex: 9999, background: "#FFFFFF", border: "1.5px solid #2563EB",
  borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
  padding: "0", display: "flex", flexDirection: "column", maxHeight: "90vh",
  maxWidth: "calc(100vw - 32px)",
};
const headerStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  borderBottom: "1px solid #e5e7eb", padding: "16px 24px",
};
const titleStyle: React.CSSProperties = { fontSize: "18px", fontWeight: 700, color: "#1a1a1a" };
const closeBtnBase: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", padding: "4px",
  borderRadius: "6px", color: "#666", display: "flex", alignItems: "center",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px",
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "#FFFFFF", border: "1.5px solid #d1d5db",
  borderRadius: "8px", padding: "10px 12px", fontSize: "14px", color: "#1a1a1a",
  outline: "none", boxSizing: "border-box",
};
const footerStyle: React.CSSProperties = {
  display: "flex", justifyContent: "flex-end", gap: "12px",
  borderTop: "1px solid #e5e7eb", padding: "16px 24px",
};
const primaryBtnStyle: React.CSSProperties = {
  background: "#2563EB", color: "#FFFFFF", border: "none", padding: "8px 20px",
  borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer",
  display: "flex", alignItems: "center", gap: "6px",
};

/* ============================================================
   ADD CLAIM DIALOG
   ============================================================ */
function AddClaimDialog({
  open, onClose, onSuccess, prefillOrder,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillOrder?: any;
}) {
  const [step, setStep] = useState<"search" | "form">(prefillOrder ? "form" : "search");
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<any | null>(prefillOrder || null);
  const [issueType, setIssueType] = useState("");
  const [claimStatus, setClaimStatus] = useState("PENDING");
  const [issueDesc, setIssueDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (prefillOrder) {
      setSelected(prefillOrder);
      setStep("form");
    }
  }, [prefillOrder]);

  useEffect(() => {
    if (!open) {
      setStep(prefillOrder ? "form" : "search");
      setSearchQ("");
      setResults([]);
      setSelected(prefillOrder || null);
      setIssueType("");
      setClaimStatus("PENDING");
      setIssueDesc("");
      setDeadline("");
      setError("");
    }
  }, [open, prefillOrder]);

  const doSearch = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    fetch(`/api/claims/search-orders?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => setResults(d.orders || []))
      .finally(() => setSearching(false));
  }, []);

  const onSearchChange = (v: string) => {
    setSearchQ(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  const handleSave = async () => {
    if (!selected || !issueType) {
      setError("Vui lòng chọn Loại Vấn Đề");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selected.id,
          issueType,
          claimStatus,
          issueDescription: issueDesc || null,
          deadline: deadline || null,
          source: prefillOrder ? "FROM_ORDERS" : "MANUAL",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Lỗi khi tạo");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={{ ...dialogBase, width: step === "search" ? "560px" : "640px" }}>
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "8px", background: "#eff6ff" }}>
              <Plus size={18} color="#2563EB" />
            </div>
            <span style={titleStyle}>
              {step === "search" ? "Tìm đơn hàng" : "Thêm vào Đơn Có Vấn Đề"}
            </span>
          </div>
          <button style={closeBtnBase} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {step === "search" && (
            <>
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <Search size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "#9ca3af" }} />
                <input
                  style={{ ...inputStyle, paddingLeft: "36px" }}
                  placeholder="Tìm mã đơn, SĐT, mã đối tác..."
                  value={searchQ}
                  onChange={e => onSearchChange(e.target.value)}
                  autoFocus
                />
              </div>
              {searching && <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}><Loader2 className="animate-spin inline" size={18} /> Đang tìm...</div>}
              {results.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {results.map((o: any) => (
                    <button
                      key={o.id}
                      onClick={() => { setSelected(o); setStep("form"); }}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: "8px",
                        background: "#fff", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.background = "#f8faff"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#fff"; }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "#1a1a1a" }}>{o.requestCode}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{o.shopName} — {o.carrierName}</div>
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#059669" }}>{formatVND(o.codAmount)}</div>
                    </button>
                  ))}
                </div>
              )}
              {searchQ.length >= 2 && !searching && results.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af", fontSize: "13px" }}>Không tìm thấy đơn hàng nào</div>
              )}
            </>
          )}

          {step === "form" && selected && (
            <>
              {/* Order info summary */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}>
                  <div><span style={{ color: "#6b7280" }}>Mã YC: </span><strong>{selected.requestCode}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>Đối tác: </span><strong>{selected.carrierName}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>Shop: </span><strong>{selected.shopName}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>COD: </span><strong style={{ color: "#059669" }}>{formatVND(selected.codAmount)}</strong></div>
                </div>
              </div>

              {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", color: "#dc2626", fontSize: "13px" }}>{error}</div>}

              {/* Required fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Loại Vấn Đề *</label>
                  <select
                    style={inputStyle}
                    value={issueType}
                    onChange={e => setIssueType(e.target.value)}
                  >
                    <option value="">— Chọn —</option>
                    {Object.entries(ISSUE_TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Trạng Thái XL</label>
                  <select style={inputStyle} value={claimStatus} onChange={e => setClaimStatus(e.target.value)}>
                    {Object.entries(CLAIM_STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Nội Dung Vấn Đề</label>
                <textarea
                  style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
                  value={issueDesc}
                  onChange={e => setIssueDesc(e.target.value)}
                  placeholder="Mô tả vấn đề..."
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Thời Hạn</label>
                <input style={inputStyle} type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
            </>
          )}
        </div>

        {step === "form" && (
          <div style={footerStyle}>
            <button style={{ ...primaryBtnStyle, background: "transparent", color: "#374151", border: "1px solid #d1d5db" }} onClick={() => { if (!prefillOrder) { setStep("search"); setSelected(null); } else onClose(); }}>
              {prefillOrder ? "Hủy" : "← Quay lại"}
            </button>
            <button style={primaryBtnStyle} onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
              Lưu
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

/* ============================================================
   DETAIL PANEL
   ============================================================ */
function ClaimDetailPanel({
  claimId, open, onClose,
}: { claimId: string; open: boolean; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && claimId) {
      setLoading(true);
      fetch(`/api/claims/${claimId}`)
        .then(r => r.json())
        .then(d => setData(d))
        .finally(() => setLoading(false));
    }
  }, [open, claimId]);

  if (!open) return null;

  const statusCfg = data ? CLAIM_STATUS_CONFIG[data.claimStatus] : null;

  return createPortal(
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "520px", maxWidth: "100vw",
        zIndex: 9999, background: "#fff", borderLeft: "1.5px solid #2563EB",
        boxShadow: "-8px 0 30px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column",
      }}>
        <div style={headerStyle}>
          <span style={titleStyle}>Chi tiết đơn có vấn đề</span>
          <button style={closeBtnBase} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading && <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}><Loader2 className="animate-spin inline" size={20} /></div>}
          {data && !loading && (
            <>
              {/* Section 1: Order Info */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#374151", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Package size={15} /> Thông tin đơn hàng
                </h3>
                <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "14px", fontSize: "13px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div><span style={{ color: "#6b7280" }}>Mã YC: </span><strong>{data.order?.requestCode}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>Đối tác: </span><strong>{data.order?.carrierName}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>Shop: </span><strong>{data.order?.shopName}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>COD: </span><strong style={{ color: "#059669" }}>{formatVND(data.order?.codAmount || 0)}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>Tổng phí: </span><strong>{formatVND(data.order?.totalFee || 0)}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>Trạng thái: </span><strong>{data.order?.status}</strong></div>
                </div>
              </div>

              {/* Section 2: Issue Info */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#374151", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={15} /> Thông tin vấn đề
                </h3>
                <div style={{ background: "#fff7ed", borderRadius: "8px", padding: "14px", fontSize: "13px" }}>
                  <div style={{ marginBottom: "6px" }}><span style={{ color: "#6b7280" }}>Loại: </span><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${ISSUE_TYPE_CONFIG[data.issueType]?.bg} ${ISSUE_TYPE_CONFIG[data.issueType]?.text}`}>{ISSUE_TYPE_CONFIG[data.issueType]?.label}</span></div>
                  {data.issueDescription && <div style={{ marginBottom: "6px" }}><span style={{ color: "#6b7280" }}>Nội dung: </span>{data.issueDescription}</div>}
                  <div style={{ marginBottom: "6px" }}><span style={{ color: "#6b7280" }}>Ngày phát hiện: </span>{format(new Date(data.detectedDate), "dd/MM/yyyy", { locale: vi })}</div>
                  {data.deadline && <div style={{ marginBottom: "6px" }}><span style={{ color: "#6b7280" }}>Thời hạn: </span>{format(new Date(data.deadline), "dd/MM/yyyy", { locale: vi })}</div>}
                  <div><span style={{ color: "#6b7280" }}>Nguồn: </span>{data.source}</div>
                </div>
              </div>

              {/* Section 3: Processing */}
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#374151", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FileText size={15} /> Xử lý
                </h3>
                <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "14px", fontSize: "13px" }}>
                  {statusCfg && <div style={{ marginBottom: "8px" }}><span className={`inline-flex px-3 py-1 rounded-full text-[12px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>{statusCfg.label}</span></div>}
                  {data.processingContent && <div style={{ marginBottom: "8px" }} dangerouslySetInnerHTML={{ __html: data.processingContent }} />}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                    <div><span style={{ color: "#6b7280" }}>NVC đền bù: </span><strong>{formatVND(data.carrierCompensation)}</strong></div>
                    <div><span style={{ color: "#6b7280" }}>Đền bù KH: </span><strong>{formatVND(data.customerCompensation)}</strong></div>
                  </div>
                </div>
              </div>

              {/* Section 4: Status History */}
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#374151", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Clock size={15} /> Lịch sử xử lý
                </h3>
                <div style={{ borderLeft: "2px solid #e5e7eb", paddingLeft: "16px", marginLeft: "8px" }}>
                  {data.statusHistory?.map((h: any, i: number) => (
                    <div key={h.id} style={{ position: "relative", marginBottom: "16px" }}>
                      <div style={{
                        position: "absolute", left: "-24px", top: "2px", width: "12px", height: "12px",
                        borderRadius: "50%", border: "2px solid",
                        borderColor: i === 0 ? "#2563EB" : "#d1d5db",
                        background: i === 0 ? "#2563EB" : "#fff",
                      }} />
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>
                        {CLAIM_STATUS_CONFIG[h.toStatus]?.label || h.toStatus}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                        {h.changedBy} — {format(new Date(h.changedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                      </div>
                      {h.note && <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{h.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

/* ============================================================
   INLINE STATUS DROPDOWN
   ============================================================ */
function StatusDropdown({
  claimId, currentStatus, onUpdate,
}: { claimId: string; currentStatus: string; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cfg = CLAIM_STATUS_CONFIG[currentStatus] || CLAIM_STATUS_CONFIG.PENDING;

  const changeStatus = async (newStatus: string) => {
    if (newStatus === currentStatus) { setOpen(false); return; }
    setLoading(true);
    try {
      await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimStatus: newStatus }),
      });
      onUpdate();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold cursor-pointer border ${cfg.bg} ${cfg.text} hover:opacity-80 transition-opacity`}
        disabled={loading}
      >
        {loading ? <Loader2 className="animate-spin" size={12} /> : null}
        {cfg.label}
        <ChevronDown size={12} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 100, marginTop: "4px",
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: "180px", overflow: "hidden",
        }}>
          {Object.entries(CLAIM_STATUS_CONFIG).map(([k, v]) => (
            <button
              key={k}
              onClick={() => changeStatus(k)}
              style={{
                display: "flex", alignItems: "center", gap: "8px", width: "100%",
                padding: "8px 12px", border: "none", background: k === currentStatus ? "#f3f4f6" : "#fff",
                cursor: "pointer", fontSize: "12px", fontWeight: k === currentStatus ? 700 : 500,
                color: "#374151", textAlign: "left",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f8faff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = k === currentStatus ? "#f3f4f6" : "#fff"; }}
            >
              <span className={`w-2 h-2 rounded-full ${v.bg}`} />
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PROCESSING CONTENT POPUP (simplified, no Tiptap for initial build)
   ============================================================ */
function ProcessingContentPopup({
  claimId, open, onClose, initialContent, onUpdate,
}: { claimId: string; open: boolean; onClose: () => void; initialContent: string; onUpdate: () => void }) {
  const [content, setContent] = useState(initialContent || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setContent(initialContent || ""); }, [initialContent]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processingContent: content }),
      });
      onUpdate();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={{ ...dialogBase, width: "560px" }}>
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "8px", background: "#eff6ff" }}>
              <FileText size={18} color="#2563EB" />
            </div>
            <span style={titleStyle}>Nội Dung Xử Lý</span>
          </div>
          <button style={closeBtnBase} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <textarea
            style={{ ...inputStyle, minHeight: "200px", resize: "vertical", fontFamily: "inherit" }}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Nhập nội dung xử lý..."
          />
        </div>
        <div style={footerStyle}>
          <button style={{ ...primaryBtnStyle, background: "transparent", color: "#374151", border: "1px solid #d1d5db" }} onClick={onClose}>Hủy</button>
          <button style={primaryBtnStyle} onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            Lưu
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function ClaimsClient() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [filterIssueType, setFilterIssueType] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCarrier, setFilterCarrier] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState("deadline");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [detailClaimId, setDetailClaimId] = useState<string | null>(null);
  const [processingPopup, setProcessingPopup] = useState<{ id: string; content: string } | null>(null);

  // Auto-detect
  const [detecting, setDetecting] = useState(false);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
        search,
        showCompleted: String(showCompleted),
        sortBy,
        sortDir,
      });
      if (filterIssueType.length) params.set("issueType", filterIssueType.join(","));
      if (filterStatus) params.set("claimStatus", filterStatus);
      if (filterCarrier) params.set("carrier", filterCarrier);

      const res = await fetch(`/api/claims?${params}`);
      const data = await res.json();
      setClaims(data.claims || []);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, search, filterIssueType, filterStatus, filterCarrier, showCompleted, sortBy, sortDir]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  const runAutoDetect = async () => {
    setDetecting(true);
    try {
      const res = await fetch("/api/claims/auto-detect", { method: "POST" });
      const data = await res.json();
      if (data.newClaims > 0) fetchClaims();
    } finally {
      setDetecting(false);
    }
  };

  // Run auto-detect on first load
  useEffect(() => { runAutoDetect(); }, []);

  const handleComplete = async (claimId: string, requestCode: string) => {
    if (!confirm(`Xác nhận đơn ${requestCode} đã hoàn tất xử lý?`)) return;
    await fetch(`/api/claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: true }),
    });
    fetchClaims();
  };

  const handleInlineEdit = async (claimId: string, field: string, value: number) => {
    await fetch(`/api/claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    fetchClaims();
  };

  const toggleIssueFilter = (type: string) => {
    setFilterIssueType(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div style={{ padding: "0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldAlert size={24} className="text-blue-600" />
            Đơn Có Vấn Đề
          </h1>
          <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
            Quản lý khiếu nại, bồi hoàn và các đơn hàng có vấn đề
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={runAutoDetect}
            disabled={detecting}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
              border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff",
              fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "#374151",
            }}
          >
            {detecting ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
            Quét tự động
          </button>
          <button
            onClick={() => setShowAddDialog(true)}
            style={{ ...primaryBtnStyle, padding: "8px 16px", fontSize: "13px" }}
          >
            <Plus size={14} /> Thêm mới
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "0 0 260px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "9px", color: "#9ca3af" }} />
          <input
            style={{ ...inputStyle, paddingLeft: "32px", padding: "7px 10px 7px 32px", fontSize: "13px" }}
            placeholder="Tìm mã đơn, SĐT, shop..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
          />
        </div>

        {/* Issue type chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {Object.entries(ISSUE_TYPE_CONFIG).map(([k, v]) => (
            <button
              key={k}
              onClick={() => toggleIssueFilter(k)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${filterIssueType.includes(k) ? `${v.bg} ${v.text} ${v.border}` : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: "12px" }}
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
        >
          <option value="">Tất cả TT xử lý</option>
          {Object.entries(CLAIM_STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Carrier filter */}
        <select
          style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: "12px" }}
          value={filterCarrier}
          onChange={e => { setFilterCarrier(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
        >
          <option value="">Tất cả ĐT</option>
          {["GHN", "GTK", "SPX", "JAT", "BSI"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Show completed toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#6b7280", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={e => { setShowCompleted(e.target.checked); setPagination(p => ({ ...p, page: 1 })); }}
            style={{ accentColor: "#2563EB" }}
          />
          Hiện đơn hoàn tất
        </label>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "10px", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
              {["STT", "Mã Yêu Cầu", "Mã ĐT", "Đối Tác", "Tên Cửa Hàng", "Trạng Thái Đơn", "COD/Giá Trị", "Tổng Phí", "Loại VĐ", "Nội Dung VĐ", "Ngày PH", "Ngày TĐ", "TT Xử Lý", "ND XL", "NVC Đền Bù", "Đền Bù KH", "Thời Hạn", "Ghi Chú", "Thao Tác"].map((h, i) => (
                <th key={i} style={{
                  padding: "10px 8px", textAlign: i >= 6 && i <= 7 || i >= 14 && i <= 15 ? "right" : "left",
                  fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                  letterSpacing: "0.05em", whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={19} style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}><Loader2 className="animate-spin inline" size={20} /> Đang tải...</td></tr>
            ) : claims.length === 0 ? (
              <tr><td colSpan={19} style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>Không có đơn nào</td></tr>
            ) : (
              claims.map((c: any, idx: number) => {
                const daysPending = daysBetween(c.detectedDate);
                const daysLeft = c.deadline ? daysUntil(c.deadline) : Infinity;
                const issCfg = ISSUE_TYPE_CONFIG[c.issueType] || ISSUE_TYPE_CONFIG.OTHER;

                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: c.isCompleted ? "#f9fafb" : idx % 2 === 0 ? "#fff" : "#fafbfc",
                      opacity: c.isCompleted ? 0.6 : 1,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (!c.isCompleted) e.currentTarget.style.background = "#f0f7ff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = c.isCompleted ? "#f9fafb" : idx % 2 === 0 ? "#fff" : "#fafbfc"; }}
                  >
                    {/* 1. STT */}
                    <td style={{ padding: "8px", color: "#94a3b8", fontWeight: 500 }}>
                      {(pagination.page - 1) * pagination.pageSize + idx + 1}
                    </td>
                    {/* 2. Mã Yêu Cầu */}
                    <td style={{ padding: "8px" }}>
                      <button
                        onClick={() => setDetailClaimId(c.id)}
                        style={{ fontWeight: 700, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontSize: "13px" }}
                      >
                        {c.order?.requestCode}
                      </button>
                    </td>
                    {/* 3. Mã ĐT */}
                    <td style={{ padding: "8px", color: "#475569", fontSize: "12px" }}>{c.order?.carrierOrderCode || "—"}</td>
                    {/* 4. Đối Tác */}
                    <td style={{ padding: "8px" }}>
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                        {c.order?.carrierName || "—"}
                      </span>
                    </td>
                    {/* 5. Tên Cửa Hàng */}
                    <td style={{ padding: "8px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#374151" }}>
                      {c.order?.shopName || "—"}
                    </td>
                    {/* 6. Trạng Thái Đơn */}
                    <td style={{ padding: "8px" }}>
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {c.order?.status || "—"}
                      </span>
                    </td>
                    {/* 7. COD */}
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "#059669" }}>
                      {formatVND(c.order?.codAmount || 0)}
                    </td>
                    {/* 8. Tổng Phí */}
                    <td style={{ padding: "8px", textAlign: "right", color: "#475569" }}>
                      {formatVND(c.order?.totalFee || 0)}
                    </td>
                    {/* 9. Loại VĐ */}
                    <td style={{ padding: "8px" }}>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${issCfg.bg} ${issCfg.text} ${issCfg.border}`}>
                        {issCfg.label}
                      </span>
                    </td>
                    {/* 10. Nội Dung VĐ */}
                    <td style={{ padding: "8px", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280", fontSize: "12px" }}
                      title={c.issueDescription || ""}
                    >
                      {c.issueDescription || "—"}
                    </td>
                    {/* 11. Ngày PH */}
                    <td style={{ padding: "8px", color: "#475569", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {format(new Date(c.detectedDate), "dd/MM/yyyy")}
                    </td>
                    {/* 12. Ngày TĐ */}
                    <td style={{ padding: "8px" }}>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${daysPending <= 7 ? "bg-green-100 text-green-700" : daysPending <= 14 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {daysPending} ngày
                      </span>
                    </td>
                    {/* 13. TT Xử Lý */}
                    <td style={{ padding: "8px" }}>
                      <StatusDropdown claimId={c.id} currentStatus={c.claimStatus} onUpdate={fetchClaims} />
                    </td>
                    {/* 14. ND XL */}
                    <td style={{ padding: "8px" }}>
                      <button
                        onClick={() => setProcessingPopup({ id: c.id, content: c.processingContent || "" })}
                        style={{
                          padding: "4px 8px", border: "1px solid #e5e7eb", borderRadius: "6px",
                          background: "#fff", cursor: "pointer", fontSize: "12px", color: "#6b7280",
                          display: "flex", alignItems: "center", gap: "4px",
                        }}
                      >
                        <FileText size={12} /> {c.processingContent ? "Sửa" : "Thêm"}
                      </button>
                    </td>
                    {/* 15. NVC Đền Bù */}
                    <td style={{ padding: "8px", textAlign: "right" }}>
                      {CARRIER_COMP_EDITABLE.includes(c.claimStatus) ? (
                        <input
                          type="number"
                          defaultValue={c.carrierCompensation}
                          onBlur={e => handleInlineEdit(c.id, "carrierCompensation", Number(e.target.value))}
                          style={{ width: "80px", textAlign: "right", border: "1px solid #d1d5db", borderRadius: "6px", padding: "4px 6px", fontSize: "12px" }}
                        />
                      ) : (
                        <span style={{ color: c.carrierCompensation > 0 ? "#0d9488" : "#94a3b8", fontSize: "12px" }}>
                          {formatVND(c.carrierCompensation)}
                        </span>
                      )}
                    </td>
                    {/* 16. Đền Bù KH */}
                    <td style={{ padding: "8px", textAlign: "right" }}>
                      {CUSTOMER_COMP_EDITABLE.includes(c.claimStatus) ? (
                        <input
                          type="number"
                          defaultValue={c.customerCompensation}
                          onBlur={e => handleInlineEdit(c.id, "customerCompensation", Number(e.target.value))}
                          style={{ width: "80px", textAlign: "right", border: "1px solid #d1d5db", borderRadius: "6px", padding: "4px 6px", fontSize: "12px" }}
                        />
                      ) : (
                        <span style={{ color: c.customerCompensation > 0 ? "#0d9488" : "#94a3b8", fontSize: "12px" }}>
                          {formatVND(c.customerCompensation)}
                        </span>
                      )}
                    </td>
                    {/* 17. Thời Hạn */}
                    <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                      {c.deadline ? (
                        <span
                          style={{
                            fontSize: "12px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px",
                            background: daysLeft < 0 ? "#fef2f2" : daysLeft <= 3 ? "#fefce8" : "transparent",
                            color: daysLeft < 0 ? "#dc2626" : daysLeft <= 3 ? "#ca8a04" : "#475569",
                          }}
                        >
                          {format(new Date(c.deadline), "dd/MM/yyyy")}
                        </span>
                      ) : "—"}
                    </td>
                    {/* 18. Ghi Chú */}
                    <td style={{ padding: "8px", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280", fontSize: "12px" }}>
                      {c.order?.staffNotes || "—"}
                    </td>
                    {/* 19. Thao Tác */}
                    <td style={{ padding: "8px" }}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          onClick={() => setDetailClaimId(c.id)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleComplete(c.id, c.order?.requestCode)}
                          disabled={!COMPLETION_STATUSES.includes(c.claimStatus) || c.isCompleted}
                          className="p-1.5 text-green-500 hover:bg-green-50 rounded border border-transparent hover:border-green-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Hoàn tất"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 0 && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: "16px", fontSize: "13px", color: "#6b7280",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>Hiển thị</span>
            <select
              value={pagination.pageSize}
              onChange={e => setPagination(p => ({ ...p, pageSize: Number(e.target.value), page: 1 }))}
              style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "4px 8px", fontSize: "13px" }}
            >
              {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>/ {pagination.total} đơn</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-[13px] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center font-bold"
            >
              <ChevronLeft size={14} className="mr-1" /> Trước
            </button>
            <span className="font-semibold text-slate-700">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-[13px] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center font-bold"
            >
              Sau <ChevronRight size={14} className="ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddClaimDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={fetchClaims}
      />

      <ClaimDetailPanel
        claimId={detailClaimId || ""}
        open={!!detailClaimId}
        onClose={() => setDetailClaimId(null)}
      />

      {processingPopup && (
        <ProcessingContentPopup
          claimId={processingPopup.id}
          open={true}
          onClose={() => setProcessingPopup(null)}
          initialContent={processingPopup.content}
          onUpdate={fetchClaims}
        />
      )}
    </div>
  );
}
