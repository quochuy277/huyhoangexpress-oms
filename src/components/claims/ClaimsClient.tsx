"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search, Plus, Download, X, ChevronLeft, ChevronRight,
  AlertTriangle, Eye, CheckSquare, Check, Loader2,
  FileText, Clock, Ban, Zap, HelpCircle, Package, ShieldAlert,
  ChevronDown, Calendar, RotateCcw, MessageSquare, Trash2, Truck
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { InlineStaffNote } from "@/components/shared/InlineStaffNote";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { TrackingPopup } from "@/components/tracking/TrackingPopup";

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
      <div style={{ ...dialogBase, width: "min(" + (step === "search" ? "560px" : "640px") + ", calc(100vw - 32px))" }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }} className="resp-grid-1-2">
                  <div><span style={{ color: "#6b7280" }}>Mã YC: </span><strong>{selected.requestCode}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>Đối tác: </span><strong>{selected.carrierName}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>Shop: </span><strong>{selected.shopName}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>COD: </span><strong style={{ color: "#059669" }}>{formatVND(selected.codAmount)}</strong></div>
                </div>
              </div>

              {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", color: "#dc2626", fontSize: "13px" }}>{error}</div>}

              {/* Required fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }} className="resp-grid-1-2">
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
   FIELD LABEL MAP for change history display
   ============================================================ */
const FIELD_LABEL_MAP: Record<string, string> = {
  claimStatus: "Trạng thái xử lý",
  issueType: "Loại vấn đề",
  issueDescription: "Nội dung vấn đề",
  processingContent: "Nội dung xử lý",
  carrierCompensation: "NVC đền bù",
  customerCompensation: "Đền bù KH",
  deadline: "Thời hạn",
};

function getDisplayValue(fieldName: string, value: string | null): string {
  if (!value) return "—";
  if (fieldName === "claimStatus") return CLAIM_STATUS_CONFIG[value]?.label || value;
  if (fieldName === "issueType") return ISSUE_TYPE_CONFIG[value]?.label || value;
  if (fieldName === "carrierCompensation" || fieldName === "customerCompensation") return formatVND(parseFloat(value) || 0);
  if (fieldName === "deadline") {
    try { return format(new Date(value), "dd/MM/yyyy"); } catch { return value; }
  }
  return value.length > 50 ? value.slice(0, 50) + "..." : value;
}

/* ============================================================
   DETAIL PANEL — Redesigned 700px with inline editing
   ============================================================ */
/* Editable fields buffered locally before manual save */
type LocalEdits = {
  issueType: string;
  issueDescription: string;
  deadline: string; // "YYYY-MM-DD" or ""
  claimStatus: string;
  processingContent: string;
  carrierCompensation: number;
  customerCompensation: number;
};

function toLocalEdits(d: any): LocalEdits {
  return {
    issueType: d.issueType || "",
    issueDescription: d.issueDescription || "",
    deadline: d.deadline ? new Date(d.deadline).toISOString().split("T")[0] : "",
    claimStatus: d.claimStatus || "",
    processingContent: d.processingContent || "",
    carrierCompensation: d.carrierCompensation || 0,
    customerCompensation: d.customerCompensation || 0,
  };
}

function computeIsDirty(edits: LocalEdits, original: any): boolean {
  const origDeadline = original.deadline ? new Date(original.deadline).toISOString().split("T")[0] : "";
  return (
    edits.issueType !== (original.issueType || "") ||
    edits.issueDescription !== (original.issueDescription || "") ||
    edits.deadline !== origDeadline ||
    edits.claimStatus !== (original.claimStatus || "") ||
    edits.processingContent !== (original.processingContent || "") ||
    Number(edits.carrierCompensation) !== Number(original.carrierCompensation || 0) ||
    Number(edits.customerCompensation) !== Number(original.customerCompensation || 0)
  );
}

function ClaimDetailPanel({
  claimId, open, onClose, onUpdate, onAddTodo, onComplete, onDelete, onTrackOrder,
}: {
  claimId: string; open: boolean; onClose: () => void; onUpdate?: () => void;
  onAddTodo?: (data: any) => void;
  onComplete?: (id: string, requestCode: string) => void;
  onDelete?: (id: string, requestCode: string) => void;
  onTrackOrder?: (requestCode: string) => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [edits, setEdits] = useState<LocalEdits | null>(null);

  const fetchDetail = useCallback(() => {
    if (!claimId) return;
    setLoading(true);
    fetch(`/api/claims/${claimId}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, [claimId]);

  useEffect(() => {
    if (open && claimId) fetchDetail();
  }, [open, claimId, fetchDetail]);

  // Khi data load về (lần đầu hoặc sau khi save), sync localEdits
  useEffect(() => {
    if (data) setEdits(toLocalEdits(data));
  }, [data]);

  const isDirty = !!(data && edits && computeIsDirty(edits, data));
  const canEditCarrierComp = edits?.claimStatus === "CARRIER_COMPENSATED";
  const canEditCustomerComp = ["CARRIER_COMPENSATED", "CARRIER_REJECTED", "CUSTOMER_COMPENSATED"].includes(edits?.claimStatus || "");

  const setEdit = <K extends keyof LocalEdits>(field: K, value: LocalEdits[K]) => {
    setEdits(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = async () => {
    if (!data || !edits || !isDirty) return;
    // Build diff — chỉ gửi các field thực sự thay đổi
    const changes: Record<string, any> = {};
    if (edits.issueType !== (data.issueType || "")) changes.issueType = edits.issueType;
    if (edits.issueDescription !== (data.issueDescription || "")) changes.issueDescription = edits.issueDescription || null;
    const origDeadline = data.deadline ? new Date(data.deadline).toISOString().split("T")[0] : "";
    if (edits.deadline !== origDeadline) changes.deadline = edits.deadline || null;
    if (edits.claimStatus !== (data.claimStatus || "")) changes.claimStatus = edits.claimStatus;
    if (edits.processingContent !== (data.processingContent || "")) changes.processingContent = edits.processingContent || null;
    if (Number(edits.carrierCompensation) !== Number(data.carrierCompensation || 0)) changes.carrierCompensation = Number(edits.carrierCompensation) || 0;
    if (Number(edits.customerCompensation) !== Number(data.customerCompensation || 0)) changes.customerCompensation = Number(edits.customerCompensation) || 0;

    setSaving(true);
    try {
      await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      fetchDetail(); // Reload data → triggers useEffect → resets edits
      onUpdate?.();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (data) setEdits(toLocalEdits(data));
  };

  const handleClose = () => {
    if (isDirty && !confirm("Bạn có thay đổi chưa lưu. Thoát mà không lưu?")) return;
    onClose();
  };

  if (!open) return null;

  // Merge statusHistory + changeLogs into unified timeline
  const timeline: any[] = [];
  if (data?.statusHistory) {
    data.statusHistory.forEach((h: any) => { timeline.push({ type: "status", ...h }); });
  }
  if (data?.changeLogs) {
    data.changeLogs.forEach((l: any) => {
      if (l.fieldName !== "claimStatus") timeline.push({ type: "change", ...l });
    });
  }
  timeline.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "10px", display: "flex", alignItems: "center", gap: "7px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
      {icon} {title}
    </h3>
  );

  const infoRow = (label: string, value: React.ReactNode) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ color: "#6b7280", fontSize: "12px" }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: "12px", color: "#1e293b", textAlign: "right", maxWidth: "55%" }}>{value}</span>
    </div>
  );

  return createPortal(
    <>
      <div style={overlayStyle} onClick={handleClose} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(700px, 100vw)",
        zIndex: 9999, background: "#f8fafc", borderLeft: `2px solid ${isDirty ? "#f59e0b" : "#2563EB"}`,
        boxShadow: "-12px 0 40px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column",
        animation: "slideIn 0.25s ease-out",
        transition: "border-color 0.2s",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 16px", background: "#fff", borderBottom: "1px solid #e5e7eb",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "6px", borderRadius: "8px", background: isDirty ? "#fef3c7" : "#eff6ff" }}>
              <ShieldAlert size={18} color={isDirty ? "#d97706" : "#2563EB"} />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                Chi Tiết Đơn Có Vấn Đề
                {isDirty && (
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px",
                    background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a",
                    letterSpacing: "0.02em",
                  }}>
                    ● Chưa lưu
                  </span>
                )}
                {saveSuccess && (
                  <span style={{
                    fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px",
                    background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0",
                  }}>
                    ✓ Đã lưu
                  </span>
                )}
              </div>
              {data?.order?.requestCode && (
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "1px" }}>{data.order.requestCode}</div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
            {data && (
              <button
                onClick={() => { const rc = data.order?.requestCode; if (rc && onTrackOrder) onTrackOrder(rc); }}
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", border: "1.5px solid #6ee7b7", background: "#ecfdf5", color: "#059669", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#d1fae5"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#ecfdf5"; }}
                title="Tra hành trình"
              >
                <Truck size={13} /> Hành trình
              </button>
            )}
            {data && onAddTodo && (
              <button
                onClick={() => onAddTodo(data)}
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", border: "1.5px solid #93c5fd", background: "#eff6ff", color: "#2563EB", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#dbeafe"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#eff6ff"; }}
                title="Thêm vào Công Việc"
              >
                <CheckSquare size={13} /> Công Việc
              </button>
            )}
            {data && onComplete && (
              <button
                onClick={() => onComplete(claimId, data.order?.requestCode || "")}
                disabled={!COMPLETION_STATUSES.includes(data.claimStatus) || data.isCompleted}
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", border: "1.5px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s", opacity: (!COMPLETION_STATUSES.includes(data.claimStatus) || data.isCompleted) ? 0.4 : 1 }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "#dcfce7"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#f0fdf4"; }}
                title={data.isCompleted ? "Đã hoàn tất" : !COMPLETION_STATUSES.includes(data.claimStatus) ? "Chưa đủ điều kiện hoàn tất" : "Hoàn tất xử lý"}
              >
                <Check size={13} /> Hoàn tất
              </button>
            )}
            {data && onDelete && (
              <button
                onClick={() => onDelete(claimId, data.order?.requestCode || "")}
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", border: "1.5px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fef2f2"; }}
                title="Xóa đơn"
              >
                <Trash2 size={13} /> Xóa
              </button>
            )}
            <button onClick={handleClose} style={{ ...closeBtnBase, width: "32px", height: "32px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {loading && <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}><Loader2 className="animate-spin inline" size={24} /></div>}
          {data && edits && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

              {/* === Section 1: Thông tin đơn hàng === */}
              <div style={{ background: "#fff", borderRadius: "10px", padding: "16px 18px", border: "1px solid #e5e7eb" }}>
                {sectionTitle(<Package size={14} color="#2563EB" />, "Thông tin đơn hàng")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }} className="resp-grid-1-2">
                  {infoRow("Mã yêu cầu", <span style={{ color: "#2563EB", fontWeight: 700 }}>{data.order?.requestCode || "—"}</span>)}
                  {infoRow("Mã ĐT đối tác", data.order?.carrierOrderCode || "—")}
                  {infoRow("Cửa hàng", data.order?.shopName || "—")}
                  {infoRow("COD / Giá trị", <span style={{ color: "#059669" }}>{formatVND(data.order?.codAmount || 0)}</span>)}
                  {infoRow("Tổng phí", formatVND(data.order?.totalFee || 0))}
                  {infoRow("Trạng thái đơn", data.order?.status || "—")}
                  {infoRow("Thời gian lấy hàng", data.order?.pickupTime ? format(new Date(data.order.pickupTime), "dd/MM/yyyy HH:mm") : "—")}
                  {infoRow("Nhóm Vùng miền", data.order?.regionGroup || "—")}
                </div>
                <div style={{ marginTop: "8px", padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ color: "#6b7280", fontSize: "12px", display: "block", marginBottom: "4px" }}>Ghi chú nội bộ</span>
                  <span style={{ fontWeight: 500, fontSize: "12px", color: "#1e293b", whiteSpace: "pre-wrap" }}>{data.order?.internalNotes || "—"}</span>
                </div>
              </div>

              {/* === Section 2: Thông tin vấn đề (editable) === */}
              <div style={{ background: "#fff", borderRadius: "10px", padding: "16px 18px", border: "1px solid #fde68a" }}>
                {sectionTitle(<AlertTriangle size={14} color="#d97706" />, "Thông tin vấn đề")}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>Loại vấn đề</label>
                    <select
                      value={edits.issueType}
                      onChange={e => setEdit("issueType", e.target.value)}
                      style={{ ...inputStyle, fontSize: "13px", padding: "7px 10px", cursor: "pointer" }}
                    >
                      {Object.entries(ISSUE_TYPE_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>Nội dung vấn đề</label>
                    <textarea
                      value={edits.issueDescription}
                      onChange={e => setEdit("issueDescription", e.target.value)}
                      placeholder="Mô tả chi tiết vấn đề..."
                      style={{ ...inputStyle, minHeight: "60px", resize: "vertical", fontSize: "13px" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }} className="resp-grid-1-2">
                    <div>
                      <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>Ngày phát hiện</label>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", padding: "7px 10px", background: "#f1f5f9", borderRadius: "6px" }}>
                        {format(new Date(data.detectedDate), "dd/MM/yyyy", { locale: vi })}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>Ngày tồn đọng</label>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", padding: "7px 10px", background: "#f1f5f9", borderRadius: "6px" }}>
                        {daysBetween(data.detectedDate)} ngày
                      </div>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>Thời hạn</label>
                    <input
                      type="date"
                      value={edits.deadline}
                      onChange={e => setEdit("deadline", e.target.value)}
                      style={{ ...inputStyle, fontSize: "13px", padding: "7px 10px" }}
                    />
                  </div>
                </div>
              </div>

              {/* === Section 3: Xử lý (editable) === */}
              <div style={{ background: "#fff", borderRadius: "10px", padding: "16px 18px", border: "1px solid #bbf7d0" }}>
                {sectionTitle(<FileText size={14} color="#16a34a" />, "Xử lý")}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>Trạng thái xử lý</label>
                    <select
                      value={edits.claimStatus}
                      onChange={e => setEdit("claimStatus", e.target.value)}
                      style={{ ...inputStyle, fontSize: "13px", padding: "7px 10px", cursor: "pointer" }}
                    >
                      {Object.entries(CLAIM_STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>Nội dung xử lý</label>
                    <textarea
                      value={edits.processingContent}
                      onChange={e => setEdit("processingContent", e.target.value)}
                      placeholder="Nhập nội dung xử lý..."
                      style={{ ...inputStyle, minHeight: "60px", resize: "vertical", fontSize: "13px" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }} className="resp-grid-1-2">
                    <div>
                      <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>
                        NVC đền bù
                        {!canEditCarrierComp && <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 400 }}> (khóa)</span>}
                      </label>
                      {canEditCarrierComp ? (
                        <input
                          type="number"
                          value={edits.carrierCompensation}
                          onChange={e => setEdit("carrierCompensation", parseFloat(e.target.value) || 0)}
                          min={0}
                          style={{ ...inputStyle, fontSize: "13px", padding: "7px 10px" }}
                        />
                      ) : (
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", padding: "7px 10px", background: "#f1f5f9", borderRadius: "6px" }}>
                          {formatVND(data.carrierCompensation || 0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>
                        Đền bù KH
                        {!canEditCustomerComp && <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: 400 }}> (khóa)</span>}
                      </label>
                      {canEditCustomerComp ? (
                        <input
                          type="number"
                          value={edits.customerCompensation}
                          onChange={e => setEdit("customerCompensation", parseFloat(e.target.value) || 0)}
                          min={0}
                          style={{ ...inputStyle, fontSize: "13px", padding: "7px 10px" }}
                        />
                      ) : (
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#374151", padding: "7px 10px", background: "#f1f5f9", borderRadius: "6px" }}>
                          {formatVND(data.customerCompensation || 0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* === Section 4: Lịch sử (merged timeline) === */}
              <div style={{ background: "#fff", borderRadius: "10px", padding: "16px 18px", border: "1px solid #e5e7eb" }}>
                {sectionTitle(<Clock size={14} color="#6366f1" />, "Lịch sử thay đổi")}
                {timeline.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px", color: "#9ca3af", fontSize: "12px" }}>Chưa có lịch sử</div>
                ) : (
                  <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: "16px", marginLeft: "6px" }}>
                    {timeline.map((item, i) => (
                      <div key={item.id} style={{ position: "relative", marginBottom: "14px" }}>
                        <div style={{
                          position: "absolute", left: "-23px", top: "3px", width: "10px", height: "10px",
                          borderRadius: "50%",
                          background: i === 0 ? (item.type === "status" ? "#2563EB" : "#8b5cf6") : "#e2e8f0",
                          border: `2px solid ${i === 0 ? (item.type === "status" ? "#2563EB" : "#8b5cf6") : "#d1d5db"}`,
                        }} />
                        {item.type === "status" ? (
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
                            <span style={{ color: "#6b7280", fontWeight: 400 }}>TT Xử lý → </span>
                            {CLAIM_STATUS_CONFIG[item.toStatus]?.label || item.toStatus}
                          </div>
                        ) : (
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
                            <span style={{ color: "#6b7280", fontWeight: 400 }}>{FIELD_LABEL_MAP[item.fieldName] || item.fieldName}: </span>
                            <span style={{ color: "#dc2626", textDecoration: "line-through", marginRight: "4px" }}>
                              {getDisplayValue(item.fieldName, item.oldValue)}
                            </span>
                            → <span style={{ color: "#059669" }}>{getDisplayValue(item.fieldName, item.newValue)}</span>
                          </div>
                        )}
                        <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                          {item.changedBy} — {format(new Date(item.changedAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                        </div>
                        {item.note && <div style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic" }}>{item.note}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Footer: Save / Reset — chỉ hiển thị khi có data */}
        {data && edits && (
          <div style={{
            padding: "12px 16px", background: "#fff", borderTop: "1px solid #e5e7eb",
            display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end",
          }}>
            {isDirty && (
              <button
                onClick={handleReset}
                disabled={saving}
                style={{
                  display: "flex", alignItems: "center", gap: "5px", padding: "8px 14px",
                  borderRadius: "8px", border: "1.5px solid #d1d5db", background: "#fff",
                  color: "#6b7280", fontSize: "13px", fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
                title="Hoàn tác — bỏ tất cả thay đổi chưa lưu"
              >
                <RotateCcw size={13} /> Hoàn tác
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              style={{
                display: "flex", alignItems: "center", gap: "6px", padding: "8px 18px",
                borderRadius: "8px",
                border: isDirty ? "1.5px solid #2563EB" : "1.5px solid #d1d5db",
                background: isDirty ? "#2563EB" : "#f9fafb",
                color: isDirty ? "#fff" : "#9ca3af",
                fontSize: "13px", fontWeight: 700, cursor: isDirty ? "pointer" : "default",
                transition: "all 0.2s",
                opacity: saving ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (isDirty && !saving) e.currentTarget.style.background = "#1d4ed8"; }}
              onMouseLeave={e => { e.currentTarget.style.background = isDirty ? "#2563EB" : "#f9fafb"; }}
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
              {saving ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Không có thay đổi"}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity:0 } to { transform: translateX(0); opacity:1 } }`}</style>
    </>,
    document.body
  );
}

/* ============================================================
   INLINE STATUS DROPDOWN
   ============================================================ */
function StatusDropdown({
  claimId, currentStatus, onUpdate,
}: { claimId: string; currentStatus: string; onUpdate: (newStatus: string) => void }) {
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
    setOpen(false);
    onUpdate(newStatus); // optimistic update ngay lập tức
    setLoading(true);
    try {
      await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimStatus: newStatus }),
      });
    } finally {
      setLoading(false);
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
}: { claimId: string; open: boolean; onClose: () => void; initialContent: string; onUpdate: (content: string) => void }) {
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
      onUpdate(content); // trả content về để optimistic update
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={{ ...dialogBase, width: "min(560px, calc(100vw - 32px))" }}>
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
   CONFIRM ACTION DIALOG — Beautiful replacement for confirm/alert
   ============================================================ */
function ConfirmActionDialog({
  open, onClose, onConfirm, title, description, confirmLabel, confirmColor, icon, loading, successMsg,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: "red" | "green";
  icon: React.ReactNode;
  loading?: boolean;
  successMsg?: string | null;
}) {
  if (!open) return null;

  const colors = confirmColor === "red"
    ? { bg: "#dc2626", hover: "#b91c1c", iconBg: "#fef2f2", iconBorder: "#fecaca" }
    : { bg: "#16a34a", hover: "#15803d", iconBg: "#f0fdf4", iconBorder: "#bbf7d0" };

  return createPortal(
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 10050, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }} onClick={onClose} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        zIndex: 10051, background: "#fff", borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
        width: "420px", maxWidth: "calc(100vw - 32px)", overflow: "hidden",
        animation: "confirmPopIn 0.2s ease-out",
      }}>
        {successMsg ? (
          <div style={{ padding: "40px 32px", textAlign: "center" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "50%", margin: "0 auto 16px",
              background: "#f0fdf4", border: "2px solid #bbf7d0",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "confirmPopIn 0.3s ease-out",
            }}>
              <Check size={28} color="#16a34a" />
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>Thành công!</div>
            <div style={{ fontSize: "13px", color: "#6b7280" }}>{successMsg}</div>
          </div>
        ) : (
          <>
            <div style={{ padding: "28px 28px 0" }}>
              <div style={{
                width: "52px", height: "52px", borderRadius: "50%", margin: "0 auto 16px",
                background: colors.iconBg, border: `2px solid ${colors.iconBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {icon}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "17px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>{title}</div>
                <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.6" }}>{description}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", padding: "24px 28px 28px", justifyContent: "center" }}>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  flex: 1, padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 600,
                  border: "1.5px solid #e5e7eb", background: "#fff", color: "#374151", cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#d1d5db"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
              >
                Hủy
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                style={{
                  flex: 1, padding: "10px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: 600,
                  border: "none", background: colors.bg, color: "#fff", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = colors.hover; }}
                onMouseLeave={e => { e.currentTarget.style.background = colors.bg; }}
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                {confirmLabel}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes confirmPopIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.9) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }`}</style>
    </>,
    document.body
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
type ClaimFilters = {
  page: number;
  pageSize: number;
  search: string;
  issueType: string[];
  status: string;
  showCompleted: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
};

interface ClaimsClientProps {
  onCountChange?: (count: number) => void;
  externalDetailClaimId?: string | null;
  onExternalDetailConsumed?: () => void;
}

export default function ClaimsClient({ onCountChange, externalDetailClaimId, onExternalDetailConsumed }: ClaimsClientProps = {}) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [filters, setFilters] = useState<ClaimFilters>({
    page: 1, pageSize: 20, search: "", issueType: [],
    status: "", showCompleted: false, sortBy: "deadline", sortDir: "asc",
  });
  // Controlled input value for search (debounced before applying to filters)
  const [searchInput, setSearchInput] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastFetchRef = useRef<number>(0);

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [detailClaimId, setDetailClaimId] = useState<string | null>(null);
  const [processingPopup, setProcessingPopup] = useState<{ id: string; content: string } | null>(null);
  const [todoClaimOrder, setTodoClaimOrder] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; requestCode: string; loading: boolean; success: string | null } | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState<{ id: string; requestCode: string; loading: boolean; success: string | null } | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Auto-detect
  const [detecting, setDetecting] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        search: filters.search,
        showCompleted: String(filters.showCompleted),
      });
      if (filters.issueType.length) params.set("issueType", filters.issueType.join(","));
      if (filters.status) params.set("claimStatus", filters.status);

      const res = await fetch(`/api/claims/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?(.+?)"?$/);
      a.download = filenameMatch?.[1] || "don-co-van-de.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Lỗi khi xuất file Excel. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    lastFetchRef.current = Date.now();
    try {
      const params = new URLSearchParams({
        page: String(filters.page),
        pageSize: String(filters.pageSize),
        search: filters.search,
        showCompleted: String(filters.showCompleted),
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      });
      if (filters.issueType.length) params.set("issueType", filters.issueType.join(","));
      if (filters.status) params.set("claimStatus", filters.status);

      const res = await fetch(`/api/claims?${params}`);
      const data = await res.json();
      setClaims(data.claims || []);
      const pg = data.pagination || {};
      setPagination({ total: pg.total ?? 0, totalPages: pg.totalPages ?? 0 });
      onCountChange?.(pg.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filters, onCountChange]);

  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  // Open detail panel when triggered from external tab
  useEffect(() => {
    if (externalDetailClaimId) {
      setDetailClaimId(externalDetailClaimId);
      onExternalDetailConsumed?.();
    }
  }, [externalDetailClaimId, onExternalDetailConsumed]);

  // Re-fetch when user switches back to this tab (throttle 30s to avoid excessive calls)
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFetchRef.current > 30_000) {
        fetchClaims();
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [fetchClaims]);

  const runAutoDetect = async () => {
    setDetecting(true);
    try {
      const res = await fetch("/api/claims/auto-detect", { method: "POST" });
      const data = await res.json();
      // Only refetch if auto-detect actually found/changed something
      if (data.newClaims > 0 || data.autoCompleted > 0) {
        fetchClaims();
      }
    } finally {
      setDetecting(false);
    }
  };

  // Auto-detect chỉ chạy khi user bấm nút hoặc sau khi upload Excel - không chạy tự động khi mount

  const handleComplete = (claimId: string, requestCode: string) => {
    setCompleteConfirm({ id: claimId, requestCode, loading: false, success: null });
  };

  const executeComplete = async () => {
    if (!completeConfirm) return;
    setCompleteConfirm(prev => prev ? { ...prev, loading: true } : null);
    try {
      await fetch(`/api/claims/${completeConfirm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });
      setCompleteConfirm(prev => prev ? { ...prev, loading: false, success: `Đơn ${prev.requestCode} đã hoàn tất xử lý.` } : null);
      fetchClaims();
      setTimeout(() => setCompleteConfirm(null), 1500);
    } catch {
      setCompleteConfirm(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  // Cập nhật optimistic: chỉ cập nhật row trong state, không reload toàn bảng
  const updateClaimLocal = useCallback((id: string, changes: Record<string, any>) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }, []);

  const handleInlineEdit = async (claimId: string, field: string, value: number) => {
    updateClaimLocal(claimId, { [field]: value });
    await fetch(`/api/claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const handleInlineEditField = async (claimId: string, field: string, value: string | null) => {
    updateClaimLocal(claimId, { [field]: value });
    await fetch(`/api/claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const handleDelete = (claimId: string, requestCode: string) => {
    setDeleteConfirm({ id: claimId, requestCode, loading: false, success: null });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteConfirm(prev => prev ? { ...prev, loading: true } : null);
    try {
      const res = await fetch(`/api/claims/${deleteConfirm.id}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteConfirm(prev => prev ? { ...prev, loading: false } : null);
        return;
      }
      setSelectedIds(prev => { const n = new Set(prev); n.delete(deleteConfirm.id); return n; });
      setDeleteConfirm(prev => prev ? { ...prev, loading: false, success: `Đã xóa đơn ${prev.requestCode} khỏi danh sách có vấn đề.` } : null);
      fetchClaims();
      setTimeout(() => setDeleteConfirm(null), 1500);
    } catch {
      setDeleteConfirm(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === claims.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(claims.map(c => c.id)));
    }
  };

  const handleBulkAction = async (field: string, value: string) => {
    if (selectedIds.size === 0) return;
    setBulkProcessing(true);
    try {
      await fetch("/api/claims/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds], [field]: value }),
      });
      setSelectedIds(new Set());
      fetchClaims();
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Xác nhận xóa ${selectedIds.size} đơn được chọn?`)) return;
    const count = selectedIds.size;
    setBulkProcessing(true);
    try {
      const res = await fetch("/api/claims/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      if (!res.ok) { const err = await res.json(); alert(`Lỗi: ${err.error || "Không thể xóa"}`); return; }
      setSelectedIds(new Set());
      fetchClaims();
      alert(`Đã xóa ${count} đơn thành công!`);
    } catch (e) {
      alert("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleIssueFilter = (type: string) => {
    setFilters(f => ({
      ...f,
      page: 1,
      issueType: f.issueType.includes(type) ? f.issueType.filter(t => t !== type) : [...f.issueType, type],
    }));
  };

  const toggleSort = (field: string) => {
    setFilters(f => ({
      ...f,
      page: 1,
      sortBy: field,
      sortDir: f.sortBy === field ? (f.sortDir === "asc" ? "desc" : "asc") : "asc",
    }));
  };

  return (
    <div style={{ padding: "0" }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "8px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldAlert size={24} className="text-blue-600" />
            Đơn Có Vấn Đề
          </h1>
          <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>
            Quản lý khiếu nại, bồi hoàn và các đơn hàng có vấn đề
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
            onClick={handleExport}
            disabled={exporting}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
              border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff",
              fontSize: "13px", fontWeight: 500, cursor: "pointer", color: "#374151",
            }}
          >
            {exporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
            Xuất Excel
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
        <div style={{ position: "relative", flex: "1 1 auto", minWidth: "140px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "9px", color: "#9ca3af" }} />
          <input
            style={{ ...inputStyle, paddingLeft: "32px", padding: "7px 10px 7px 32px", fontSize: "13px" }}
            placeholder="Tìm mã đơn, SĐT, shop..."
            value={searchInput}
            onChange={e => {
              const val = e.target.value;
              setSearchInput(val);
              clearTimeout(searchTimerRef.current);
              searchTimerRef.current = setTimeout(() => {
                setFilters(f => ({ ...f, search: val, page: 1 }));
              }, 400);
            }}
          />
        </div>

        {/* Issue type chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {Object.entries(ISSUE_TYPE_CONFIG).map(([k, v]) => (
            <button
              key={k}
              onClick={() => toggleIssueFilter(k)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${filters.issueType.includes(k) ? `${v.bg} ${v.text} ${v.border}` : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <select
          style={{ ...inputStyle, width: "auto", padding: "7px 10px", fontSize: "12px" }}
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
        >
          <option value="">Tất cả TT xử lý</option>
          {Object.entries(CLAIM_STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Completed filter toggle */}
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => setFilters(f => ({ ...f, showCompleted: false, page: 1 }))}
            style={{
              padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer",
              background: !filters.showCompleted ? "#2563eb" : "#fff", color: !filters.showCompleted ? "#fff" : "#64748b",
              fontWeight: 600, fontSize: "12px", transition: "all 0.2s",
            }}
          >
            Chưa hoàn tất
          </button>
          <button
            onClick={() => setFilters(f => ({ ...f, showCompleted: true, page: 1 }))}
            style={{
              padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer",
              background: filters.showCompleted ? "#10b981" : "#fff", color: filters.showCompleted ? "#fff" : "#64748b",
              fontWeight: 600, fontSize: "12px", transition: "all 0.2s",
            }}
          >
            Đã hoàn tất
          </button>
        </div>
      </div>

      {/* Keyframe for InlineStaffNote save animation */}
      <style>{`@keyframes fadeInOut { 0%{opacity:0;transform:scale(0.5)} 15%{opacity:1;transform:scale(1)} 75%{opacity:1} 100%{opacity:0;transform:scale(0.8)} }`}</style>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px",
          marginBottom: "10px", background: "#eff6ff", border: "1.5px solid #93c5fd",
          borderRadius: "10px", fontSize: "13px", flexWrap: "wrap",
        }}>
          <span style={{ fontWeight: 700, color: "#1d4ed8" }}>
            ✓ Đã chọn {selectedIds.size} đơn
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#4b5563" }}>Loại VĐ:</span>
            <select
              onChange={e => { if (e.target.value) { handleBulkAction("issueType", e.target.value); e.target.value = ""; } }}
              disabled={bulkProcessing}
              style={{
                border: "1px solid #93c5fd", borderRadius: "6px", padding: "4px 8px",
                fontSize: "12px", background: "#fff", cursor: "pointer", outline: "none",
              }}
            >
              <option value="">— Chọn —</option>
              {Object.entries(ISSUE_TYPE_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#4b5563" }}>TT Xử Lý:</span>
            <select
              onChange={e => { if (e.target.value) { handleBulkAction("claimStatus", e.target.value); e.target.value = ""; } }}
              disabled={bulkProcessing}
              style={{
                border: "1px solid #93c5fd", borderRadius: "6px", padding: "4px 8px",
                fontSize: "12px", background: "#fff", cursor: "pointer", outline: "none",
              }}
            >
              <option value="">— Chọn —</option>
              {Object.entries(CLAIM_STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleBulkDelete}
            disabled={bulkProcessing}
            style={{
              display: "flex", alignItems: "center", gap: "4px", padding: "5px 12px",
              border: "1px solid #fca5a5", borderRadius: "6px", background: "#fef2f2",
              color: "#dc2626", fontSize: "12px", fontWeight: 600, cursor: "pointer",
            }}
          >
            <Trash2 size={13} /> Xóa {selectedIds.size} đơn
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              background: "none", border: "none", color: "#6b7280", fontSize: "12px",
              cursor: "pointer", textDecoration: "underline",
            }}
          >
            Bỏ chọn
          </button>
          {bulkProcessing && <Loader2 className="animate-spin" size={16} style={{ color: "#2563EB" }} />}
        </div>
      )}

      {/* Table */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", background: "#fff", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", tableLayout: "fixed", minWidth: "1100px" }}>
            {/* Checkbox | STT | Mã YC | Mã ĐT | Tên CH | TT Đơn | COD | Loại VĐ | ND VĐ | Ngày PH | Ngày TĐ | TT Xử Lý | ND XL | Thời Hạn | Thao Tác */}
            <colgroup><col style={{ width: "32px" }} /><col style={{ width: "36px" }} /><col style={{ width: "105px" }} /><col style={{ width: "90px" }} /><col style={{ width: "90px" }} /><col style={{ width: "85px" }} /><col style={{ width: "80px" }} /><col style={{ width: "90px" }} /><col style={{ width: "120px" }} /><col style={{ width: "70px" }} /><col style={{ width: "55px" }} /><col style={{ width: "105px" }} /><col style={{ width: "55px" }} /><col style={{ width: "85px" }} /><col style={{ width: "120px" }} /></colgroup>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "8px 4px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={claims.length > 0 && selectedIds.size === claims.length}
                    onChange={toggleSelectAll}
                    style={{ accentColor: "#2563EB", cursor: "pointer" }}
                  />
                </th>
                {([
                  { label: "STT", sortField: null, align: "left" },
                  { label: "Mã YC", sortField: null, align: "left" },
                  { label: "Mã ĐT", sortField: null, align: "left" },
                  { label: "Cửa Hàng", sortField: "shopName", align: "left" },
                  { label: "TT Đơn", sortField: "status", align: "left" },
                  { label: "COD", sortField: "codAmount", align: "right" },
                  { label: "Loại VĐ", sortField: "issueType", align: "left" },
                  { label: "ND VĐ", sortField: null, align: "left" },
                  { label: "Ngày PH", sortField: "detectedDate", align: "left" },
                  { label: "Ngày TĐ", sortField: "detectedDate", align: "left" },
                  { label: "TT Xử Lý", sortField: "claimStatus", align: "left" },
                  { label: "ND XL", sortField: null, align: "left" },
                  { label: "Thời Hạn", sortField: "deadline", align: "left" },
                  { label: "Thao Tác", sortField: null, align: "left" },
                ] as { label: string; sortField: string | null; align: string }[]).map((col, i) => (
                  <th
                    key={i}
                    onClick={col.sortField ? () => toggleSort(col.sortField!) : undefined}
                    style={{
                      padding: "8px 4px",
                      textAlign: col.align as any,
                      fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                      letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden",
                      cursor: col.sortField ? "pointer" : "default",
                      userSelect: "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (col.sortField) e.currentTarget.style.background = "#eef2f7"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    {col.label}
                    {col.sortField && filters.sortBy === col.sortField && (
                      <span style={{ marginLeft: "3px", color: "#2563EB" }}>{filters.sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                    {col.sortField && filters.sortBy !== col.sortField && (
                      <ChevronDown size={10} style={{ marginLeft: "2px", opacity: 0.3, display: "inline-block", verticalAlign: "middle" }} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={15} style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}><Loader2 className="animate-spin inline" size={20} /> Đang tải...</td></tr>
              ) : claims.length === 0 ? (
                <tr><td colSpan={15} style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>Không có đơn nào</td></tr>
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
                      {/* 0. Checkbox */}
                      <td style={{ padding: "4px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          style={{ accentColor: "#2563EB", cursor: "pointer" }}
                        />
                      </td>
                      {/* 1. STT */}
                      <td style={{ padding: "6px", color: "#94a3b8", fontWeight: 500, fontSize: "12px" }}>
                        {(filters.page - 1) * filters.pageSize + idx + 1}
                      </td>
                      {/* 2. Mã Yêu Cầu */}
                      <td style={{ padding: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => setDetailClaimId(c.id)}
                          style={{ fontWeight: 700, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontFamily: "monospace" }}
                          title={c.order?.requestCode}
                        >
                          {c.order?.requestCode}
                        </button>
                      </td>
                      {/* 3. Mã ĐT */}
                      <td style={{ padding: "6px", color: "#475569", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.order?.carrierOrderCode || ""}>{c.order?.carrierOrderCode || "—"}</td>
                      {/* 4. Tên Cửa Hàng */}
                      <td style={{ padding: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#374151", fontSize: "12px" }} title={c.order?.shopName || ""}>
                        {c.order?.shopName || "—"}
                      </td>
                      {/* 5. Trạng Thái Đơn — wrap long text */}
                      <td style={{ padding: "6px" }}>
                        <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600" style={{ whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.4" }}>
                          {c.order?.status || "—"}
                        </span>
                      </td>
                      {/* 6. COD */}
                      <td style={{ padding: "6px", textAlign: "right", fontWeight: 600, color: "#059669", fontSize: "12px", whiteSpace: "nowrap" }}>
                        {formatVND(c.order?.codAmount || 0)}
                      </td>
                      {/* 7. Loại VĐ — INLINE EDITABLE */}
                      <td style={{ padding: "6px" }}>
                        <select
                          value={c.issueType}
                          onChange={e => handleInlineEditField(c.id, "issueType", e.target.value)}
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer ${issCfg.bg} ${issCfg.text} ${issCfg.border}`}
                          style={{ outline: "none", appearance: "auto", maxWidth: "100%" }}
                        >
                          {Object.entries(ISSUE_TYPE_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      {/* 8. Nội Dung VĐ — INLINE EDITABLE, full-text display */}
                      <td style={{ padding: "6px", verticalAlign: "top" }}>
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => {
                            const newVal = (e.currentTarget.textContent || "").trim();
                            if (newVal !== (c.issueDescription || "")) {
                              handleInlineEditField(c.id, "issueDescription", newVal || null);
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              (e.target as HTMLElement).blur();
                            }
                          }}
                          style={{
                            fontSize: "11px", lineHeight: "1.4",
                            color: c.issueDescription ? "#374151" : "#9ca3af",
                            fontStyle: c.issueDescription ? "normal" : "italic",
                            background: c.issueDescription ? "#fffef5" : "transparent",
                            border: c.issueDescription ? "1px solid #e5e7eb" : "1px dashed #d1d5db",
                            borderRadius: "4px",
                            padding: "3px 6px",
                            outline: "none",
                            minHeight: "20px",
                            wordBreak: "break-word",
                            whiteSpace: "pre-wrap",
                            cursor: "text",
                            transition: "all 0.15s",
                          }}
                          onFocus={e => {
                            e.currentTarget.style.border = "1px solid #2563EB";
                            e.currentTarget.style.boxShadow = "0 0 0 2px rgba(37,99,235,0.12)";
                            e.currentTarget.style.background = "#fffff0";
                          }}
                          onBlurCapture={e => {
                            e.currentTarget.style.border = c.issueDescription ? "1px solid #e5e7eb" : "1px dashed #d1d5db";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.background = c.issueDescription ? "#fffef5" : "transparent";
                          }}
                        >
                          {c.issueDescription || "Nhập nội dung..."}
                        </div>
                      </td>
                      {/* 9. Ngày PH */}
                      <td style={{ padding: "6px", color: "#475569", fontSize: "11px", whiteSpace: "nowrap" }}>
                        {format(new Date(c.detectedDate), "dd/MM/yy")}
                      </td>
                      {/* 10. Ngày TĐ */}
                      <td style={{ padding: "6px" }}>
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${daysPending <= 7 ? "bg-green-100 text-green-700" : daysPending <= 14 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                          {daysPending}d
                        </span>
                      </td>
                      {/* 11. TT Xử Lý */}
                      <td style={{ padding: "6px" }}>
                        <StatusDropdown
                          claimId={c.id}
                          currentStatus={c.claimStatus}
                          onUpdate={(newStatus) => updateClaimLocal(c.id, { claimStatus: newStatus })}
                        />
                      </td>
                      {/* 12. ND XL */}
                      <td style={{ padding: "6px" }}>
                        <button
                          onClick={() => setProcessingPopup({ id: c.id, content: c.processingContent || "" })}
                          style={{
                            padding: "3px 6px", border: "1px solid #e5e7eb", borderRadius: "4px",
                            background: "#fff", cursor: "pointer", fontSize: "11px", color: "#6b7280",
                            display: "flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap",
                          }}
                        >
                          <FileText size={11} /> {c.processingContent ? "Sửa" : "Thêm"}
                        </button>
                      </td>
                      {/* 13. Thời Hạn — INLINE EDITABLE */}
                      <td style={{ padding: "6px" }}>
                        <input
                          type="date"
                          defaultValue={c.deadline ? format(new Date(c.deadline), "yyyy-MM-dd") : ""}
                          onChange={e => handleInlineEditField(c.id, "deadline", e.target.value || null)}
                          style={{
                            width: "100%", fontSize: "11px",
                            fontWeight: 600,
                            border: "1px solid #e5e7eb", borderRadius: "4px",
                            padding: "3px 4px", outline: "none", boxSizing: "border-box",
                            color: c.deadline
                              ? (daysLeft < 0 ? "#dc2626" : daysLeft <= 3 ? "#ca8a04" : "#475569")
                              : "#9ca3af",
                            background: c.deadline
                              ? (daysLeft < 0 ? "#fef2f2" : daysLeft <= 3 ? "#fefce8" : "#fff")
                              : "#fff",
                          }}
                        />
                      </td>
                      {/* 14. Thao Tác + Ghi Chú */}
                      <td style={{ padding: "6px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {/* Row 1: action buttons */}
                          <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                            <button
                              onClick={() => setDetailClaimId(c.id)}
                              className="p-1 w-6 h-6 flex items-center justify-center text-blue-500 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setTodoClaimOrder(c); }}
                              className="p-1 w-6 h-6 flex items-center justify-center text-blue-500 hover:bg-blue-50 hover:text-blue-600 rounded border border-transparent hover:border-blue-200 transition-colors"
                              title="Thêm vào Công Việc"
                            >
                              <CheckSquare size={12} />
                            </button>
                            <button
                              onClick={async () => {
                                if (c.isCompleted) {
                                  // Un-complete: set back to uncompleted
                                  await fetch(`/api/claims/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isCompleted: false, claimStatus: "PENDING" }) });
                                  fetchClaims();
                                } else {
                                  handleComplete(c.id, c.order?.requestCode);
                                }
                              }}
                              className={`p-1 w-6 h-6 flex items-center justify-center rounded border border-transparent transition-colors ${c.isCompleted ? "text-orange-500 hover:bg-orange-50 hover:border-orange-200" : "text-green-500 hover:bg-green-50 hover:border-green-200"}`}
                              title={c.isCompleted ? "Kéo lại chưa hoàn tất" : "Hoàn tất"}
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id, c.order?.requestCode || "")}
                              className="p-1 w-6 h-6 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 rounded border border-transparent hover:border-red-200 transition-colors"
                              title="Xóa đơn"
                            >
                              <Trash2 size={12} />
                            </button>
                            <button
                              onClick={() => setTrackingCode(c.order?.requestCode || "")}
                              className="p-1 w-6 h-6 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 rounded border border-transparent hover:border-emerald-200 transition-colors"
                              title="Tra hành trình"
                            >
                              <Truck size={12} />
                            </button>
                          </div>
                          {/* Row 2: inline staff notes (Ghi Chú) */}
                          <InlineStaffNote requestCode={c.order?.requestCode || ""} initialValue={c.order?.staffNotes || ""} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
              value={filters.pageSize}
              onChange={e => setFilters(f => ({ ...f, pageSize: Number(e.target.value), page: 1 }))}
              style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "4px 8px", fontSize: "13px" }}
            >
              {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>/ {pagination.total} đơn</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setFilters(f => ({ ...f, page: Math.max(1, f.page - 1) }))}
              disabled={filters.page <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-[13px] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center font-bold"
            >
              <ChevronLeft size={14} className="mr-1" /> Trước
            </button>
            <span className="font-semibold text-slate-700">
              {filters.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setFilters(f => ({ ...f, page: Math.min(pagination.totalPages, f.page + 1) }))}
              disabled={filters.page >= pagination.totalPages}
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
        onUpdate={fetchClaims}
        onAddTodo={(data) => {
          setTodoClaimOrder({
            order: data.order,
            issueType: data.issueType,
            claimStatus: data.claimStatus,
          });
        }}
        onComplete={(id, rc) => handleComplete(id, rc)}
        onDelete={(id, rc) => handleDelete(id, rc)}
        onTrackOrder={(rc) => setTrackingCode(rc)}
      />

      {processingPopup && (
        <ProcessingContentPopup
          claimId={processingPopup.id}
          open={true}
          onClose={() => setProcessingPopup(null)}
          initialContent={processingPopup.content}
          onUpdate={(content) => updateClaimLocal(processingPopup.id, { processingContent: content })}
        />
      )}

      {/* Todo Dialog */}
      {todoClaimOrder && (
        <AddTodoDialog
          open={!!todoClaimOrder}
          onClose={() => setTodoClaimOrder(null)}
          defaultTitle={`Xử lý đơn ${todoClaimOrder.order?.requestCode || todoClaimOrder.requestCode || ""}`}
          defaultDescription={`Đơn: ${todoClaimOrder.order?.requestCode || todoClaimOrder.requestCode || ""} - Shop: ${todoClaimOrder.order?.shopName || todoClaimOrder.shopName || ""} - Loại VĐ: ${ISSUE_TYPE_CONFIG[todoClaimOrder.issueType]?.label || todoClaimOrder.issueType || ""} - TT: ${CLAIM_STATUS_CONFIG[todoClaimOrder.claimStatus]?.label || todoClaimOrder.claimStatus || ""}`}
          defaultPriority="HIGH"
          linkedOrderId={todoClaimOrder.orderId || todoClaimOrder.order?.id}
          source="FROM_CLAIMS"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmActionDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={executeDelete}
        title="Xóa đơn có vấn đề"
        description={`Bạn có chắc chắn muốn xóa đơn ${deleteConfirm?.requestCode || ""} khỏi danh sách có vấn đề? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa đơn"
        confirmColor="red"
        icon={<Trash2 size={26} color="#dc2626" />}
        loading={deleteConfirm?.loading}
        successMsg={deleteConfirm?.success}
      />

      {/* Complete Confirmation Dialog */}
      <ConfirmActionDialog
        open={!!completeConfirm}
        onClose={() => setCompleteConfirm(null)}
        onConfirm={executeComplete}
        title="Hoàn tất xử lý"
        description={`Xác nhận đơn ${completeConfirm?.requestCode || ""} đã hoàn tất xử lý? Trạng thái sẽ được đánh dấu là đã xong.`}
        confirmLabel="Hoàn tất"
        confirmColor="green"
        icon={<Check size={26} color="#16a34a" />}
        loading={completeConfirm?.loading}
        successMsg={completeConfirm?.success}
      />

      {/* Tracking Popup */}
      <TrackingPopup
        requestCode={trackingCode || ""}
        isOpen={!!trackingCode}
        onClose={() => setTrackingCode(null)}
      />
    </div>
  );
}
