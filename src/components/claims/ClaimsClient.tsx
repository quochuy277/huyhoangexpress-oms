"use client";

import { useState, useEffect, useCallback, useRef, memo } from "react";
import { createPortal } from "react-dom";
import {
  Search, Plus, Download, X, ChevronLeft, ChevronRight,
  AlertTriangle, Eye, CheckSquare, Check, Loader2,
  FileText, Clock, Ban, Zap, HelpCircle, Package, ShieldAlert,
  ChevronDown, Calendar, RotateCcw, MessageSquare, Trash2, Truck
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ClaimDetailDrawer, type ClaimDetailData } from "@/components/claims/ClaimDetailDrawer";
import { ClaimsBulkBar } from "@/components/claims/claims-table/ClaimsBulkBar";
import { ClaimsDesktopTable } from "@/components/claims/claims-table/ClaimsDesktopTable";
import { ClaimsFiltersBar } from "@/components/claims/claims-table/ClaimsFiltersBar";
import { ClaimsMobileList } from "@/components/claims/claims-table/ClaimsMobileList";
import { ClaimsToolbar } from "@/components/claims/claims-table/ClaimsToolbar";
import { InlineStaffNote } from "@/components/shared/InlineStaffNote";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { TrackingPopup } from "@/components/tracking/TrackingPopup";
import { useClaimMutations } from "@/hooks/useClaimMutations";
import { useClaimsFilters } from "@/hooks/useClaimsFilters";
import { useClaimsList } from "@/hooks/useClaimsList";
import { syncExternalClaimDetail } from "@/lib/claim-detail-navigation";
import {
  CLAIM_STATUS_CONFIG as SHARED_CLAIM_STATUS_CONFIG,
  COMPLETION_STATUSES as SHARED_COMPLETION_STATUSES,
  ISSUE_TYPE_CONFIG as SHARED_ISSUE_TYPE_CONFIG,
  formatClaimMoney,
} from "@/lib/claims-config";
import { getClaimCompleteDialogCopy, getClaimReopenDialogCopy } from "@/lib/confirm-dialog";

/* ============================================================
   CONSTANTS & HELPERS
   ============================================================ */
const ISSUE_TYPE_CONFIG = SHARED_ISSUE_TYPE_CONFIG as Record<string, { label: string; bg: string; text: string; border: string }>;
const CLAIM_STATUS_CONFIG = SHARED_CLAIM_STATUS_CONFIG as Record<string, { label: string; bg: string; text: string }>;
const COMPLETION_STATUSES = SHARED_COMPLETION_STATUSES as string[];

function formatVND(n: number) {
  return formatClaimMoney(n);
}

function daysBetween(d: string | Date) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function daysUntil(d: string | Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

function getCompleteToggleActionState(claimStatus: string, isCompleted: boolean) {
  if (isCompleted) {
    return {
      canToggle: true,
      title: "Kéo lại chưa hoàn tất",
      className: "text-orange-500 hover:bg-orange-50 hover:border-orange-200",
    };
  }

  if (COMPLETION_STATUSES.includes(claimStatus)) {
    return {
      canToggle: true,
      title: "Hoàn tất",
      className: "text-green-500 hover:bg-green-50 hover:border-green-200",
    };
  }

  return {
    canToggle: false,
    title: "Chưa đủ điều kiện hoàn tất",
    className: "text-slate-300",
  };
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
const secondaryBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "6px",
  padding: "6px 12px", borderRadius: "8px", border: "1px solid #d1d5db",
  background: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer",
  color: "#374151",
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
  const [duplicateClaimId, setDuplicateClaimId] = useState<string | null>(null);
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
      setDuplicateClaimId(null);
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
        if (res.status === 409) {
          setError(data.error || "Đơn đã có trong Đơn có vấn đề.");
          const confirmed = window.confirm(
            `Đơn ${selected.requestCode || "này"} đã có trong Đơn có vấn đề. Bạn có muốn mở chi tiết đơn hiện có để sửa lại không?`
          );
          if (confirmed && data?.claim?.id) {
            setDuplicateClaimId(data.claim.id);
          }
          return;
        }
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
                  placeholder="Tìm mã yêu cầu, mã đối tác, SĐT hoặc 4 số cuối SĐT..."
                  value={searchQ}
                  onChange={e => onSearchChange(e.target.value)}
                  autoFocus
                />
              </div>
              <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                Mặc định chỉ tìm trong 30 ngày gần nhất. Khi nhập đúng mã yêu cầu, mã đối tác
                hoặc SĐT đầy đủ, hệ thống sẽ tìm toàn bộ lịch sử.
              </p>
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
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{o.shopName} - {o.carrierName}</div>
                        {o.existingClaim && (
                          <div style={{ fontSize: "11px", color: "#b45309", marginTop: "4px", fontWeight: 600 }}>
                            Đã có trong Đơn có vấn đề {o.existingClaim.isCompleted ? "(đã hoàn tất)" : "(chưa hoàn tất)"}
                          </div>
                        )}
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

      <ClaimDetailDrawer
        claimId={duplicateClaimId || ""}
        open={!!duplicateClaimId}
        onClose={() => setDuplicateClaimId(null)}
        onUpdate={onSuccess}
      />
    </>,
    document.body
  );
}

/* ============================================================
   INLINE STATUS DROPDOWN
   ============================================================ */
function StatusDropdown({
  claimId,
  currentStatus,
  disabled = false,
  onUpdate,
}: {
  claimId: string;
  currentStatus: string;
  disabled?: boolean;
  onUpdate: (newStatus: string) => void | Promise<void>;
}) {
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
        disabled={loading || disabled}
        aria-label="Cap nhat trang thai khieu nai"
      >
        {loading ? <Loader2 className="animate-spin" size={12} /> : null}
        {cfg.label}
        <ChevronDown size={12} />
      </button>
      {open && !disabled && (
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


type ClaimActionDialogState = {
  id: string;
  requestCode: string;
  loading: boolean;
  success: string | null;
};

/* ============================================================
   CONFIRM ACTION DIALOG - Beautiful replacement for confirm/alert
   ============================================================ */
function ConfirmActionDialog({
  open, onClose, onConfirm, title, description, confirmLabel, cancelLabel = "H\u1EE7y", confirmColor, icon, loading, successMsg,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmColor: "red" | "green" | "orange";
  icon: React.ReactNode;
  loading?: boolean;
  successMsg?: string | null;
}) {
  if (!open) return null;

  const colors = confirmColor === "red"
    ? { bg: "#dc2626", hover: "#b91c1c", iconBg: "#fef2f2", iconBorder: "#fecaca" }
    : confirmColor === "orange"
      ? { bg: "#d97706", hover: "#b45309", iconBg: "#fffbeb", iconBorder: "#fde68a" }
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
                {cancelLabel}
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

interface ClaimsClientProps {
  onCountChange?: (count: number) => void;
  externalDetailClaimId?: string | null;
  onExternalDetailConsumed?: () => void;
  canCreateClaim?: boolean;
  canUpdateClaim?: boolean;
  canDeleteClaim?: boolean;
}

function ClaimsClientInner({
  onCountChange,
  externalDetailClaimId,
  onExternalDetailConsumed,
  canCreateClaim = true,
  canUpdateClaim = true,
  canDeleteClaim = true,
}: ClaimsClientProps = {}) {
  const { filters, setFilters, searchInput, setSearchInput } = useClaimsFilters();
  const {
    claims,
    setClaims,
    loading,
    pagination,
    shopOptions,
    orderStatusOptions,
    listError,
    filterOptionsError,
    fetchClaims,
  } = useClaimsList({ filters, onCountChange });
  const {
    detecting,
    exporting,
    handleExport,
    updateClaimLocal,
    handleInlineEdit,
    handleInlineEditField,
    runAutoDetect,
  } = useClaimMutations({
    filters,
    claims,
    setClaims,
    fetchClaims,
    canUpdateClaim,
  });
  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [detailClaimId, setDetailClaimId] = useState<string | null>(null);
  const [processingPopup, setProcessingPopup] = useState<{ id: string; content: string } | null>(null);
  const [todoClaimOrder, setTodoClaimOrder] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ClaimActionDialogState | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState<ClaimActionDialogState | null>(null);
  const [reopenConfirm, setReopenConfirm] = useState<ClaimActionDialogState | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    const syncResult = syncExternalClaimDetail(detailClaimId, externalDetailClaimId);

    if (syncResult.nextDetailClaimId !== detailClaimId) {
      setDetailClaimId(syncResult.nextDetailClaimId);
    }

    if (syncResult.shouldConsume) {
      onExternalDetailConsumed?.();
    }
  }, [detailClaimId, externalDetailClaimId, onExternalDetailConsumed]);


  const handleOpenTodoFromClaim = (data: ClaimDetailData) => {
    setTodoClaimOrder({
      order: data.order,
      issueType: data.issueType,
      claimStatus: data.claimStatus,
    });
  };

  const handleRequestCompleteToggle = (claimId: string, requestCode: string, isCompleted: boolean) => {
    if (isCompleted) {
      setReopenConfirm({ id: claimId, requestCode, loading: false, success: null });
      return;
    }
    setCompleteConfirm({ id: claimId, requestCode, loading: false, success: null });
  };

  const handleDrawerCompleteToggle = ({
    id,
    requestCode,
    isCompleted,
  }: {
    id: string;
    requestCode: string;
    isCompleted: boolean;
  }) => {
    handleRequestCompleteToggle(id, requestCode, isCompleted);
  };

  const executeComplete = async () => {
    if (!completeConfirm) return;
    setCompleteConfirm(prev => prev ? { ...prev, loading: true } : null);
    try {
      const res = await fetch(`/api/claims/${completeConfirm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });
      if (!res.ok) {
        setCompleteConfirm(prev => prev ? { ...prev, loading: false } : null);
        return;
      }
      setCompleteConfirm(prev => prev ? { ...prev, loading: false, success: `\u0110\u01A1n ${prev.requestCode} \u0111\u00E3 ho\u00E0n t\u1EA5t x\u1EED l\u00FD.` } : null);
      fetchClaims();
      setTimeout(() => setCompleteConfirm(null), 1500);
    } catch {
      setCompleteConfirm(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  const executeReopen = async () => {
    if (!reopenConfirm) return;
    setReopenConfirm(prev => prev ? { ...prev, loading: true } : null);
    try {
      const res = await fetch(`/api/claims/${reopenConfirm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: false }),
      });
      if (!res.ok) {
        setReopenConfirm(prev => prev ? { ...prev, loading: false } : null);
        return;
      }
      setReopenConfirm(prev => prev ? { ...prev, loading: false, success: `\u0110\u01A1n ${prev.requestCode} \u0111\u00E3 \u0111\u01B0\u1EE3c k\u00E9o l\u1EA1i ch\u01B0a ho\u00E0n t\u1EA5t.` } : null);
      fetchClaims();
      setTimeout(() => setReopenConfirm(null), 1500);
    } catch {
      setReopenConfirm(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  // Cập nhật optimistic: chỉ cập nhật row trong state, không reload toàn bảng

  const handleDelete = (claimId: string, requestCode: string) => {
    if (!canDeleteClaim) return;
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
    if (!canUpdateClaim && !canDeleteClaim) return;
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (!canUpdateClaim && !canDeleteClaim) return;
    if (selectedIds.size === claims.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(claims.map(c => c.id)));
    }
  };

  const handleBulkAction = async (field: string, value: string) => {
    if (!canUpdateClaim || selectedIds.size === 0) return;
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
    if (!canDeleteClaim || selectedIds.size === 0) return;
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

  const completeDialogCopy = getClaimCompleteDialogCopy(completeConfirm?.requestCode || "");
  const reopenDialogCopy = getClaimReopenDialogCopy(reopenConfirm?.requestCode || "");
  const canBulkSelect = canUpdateClaim || canDeleteClaim;

  return (
    <div style={{ padding: "0" }}>
      <style>{`
        @media (max-width: 768px) {
          .claims-mobile-list { display: flex !important; }
          .claims-desktop-table { display: none !important; }
          .claims-pagination { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
          .claims-pagination > div { justify-content: center !important; }
        }
      `}</style>
      {/* Header */}
      <ClaimsToolbar
        detecting={detecting}
        exporting={exporting}
        canCreateClaim={canCreateClaim}
        canUpdateClaim={canUpdateClaim}
        onRunAutoDetect={runAutoDetect}
        onExport={handleExport}
        onOpenAddDialog={() => {
          if (canCreateClaim) {
            setShowAddDialog(true);
          }
        }}
        primaryBtnStyle={primaryBtnStyle}
      />

      {/* Filters */}
      <ClaimsFiltersBar
        filters={filters}
        searchInput={searchInput}
        shopOptions={shopOptions}
        orderStatusOptions={orderStatusOptions}
        issueTypeConfig={ISSUE_TYPE_CONFIG}
        claimStatusConfig={CLAIM_STATUS_CONFIG}
        inputStyle={inputStyle}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={() => setFilters((current) => ({ ...current, search: searchInput.trim(), page: 1 }))}
        onToggleIssueFilter={toggleIssueFilter}
        onStatusChange={(value) => setFilters((current) => ({ ...current, status: value, page: 1 }))}
        onShopChange={(value) => setFilters((current) => ({ ...current, shopName: value, page: 1 }))}
        onOrderStatusChange={(value) => setFilters((current) => ({ ...current, orderStatus: value, page: 1 }))}
        onShowCompletedChange={(value) => setFilters((current) => ({ ...current, showCompleted: value, page: 1 }))}
      />

      {[listError, filterOptionsError].filter(Boolean).map((message) => (
        <div
          key={message}
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: "10px",
            padding: "10px 12px",
            fontSize: "13px",
            lineHeight: "1.5",
          }}
        >
          {message}
        </div>
      ))}

      {/* Keyframe for InlineStaffNote save animation */}
      <style>{`@keyframes fadeInOut { 0%{opacity:0;transform:scale(0.5)} 15%{opacity:1;transform:scale(1)} 75%{opacity:1} 100%{opacity:0;transform:scale(0.8)} }`}</style>

      {/* Bulk Actions Bar */}
      <ClaimsBulkBar
        selectedCount={selectedIds.size}
        bulkProcessing={bulkProcessing}
        canUpdateClaim={canUpdateClaim}
        canDeleteClaim={canDeleteClaim}
        issueTypeConfig={ISSUE_TYPE_CONFIG}
        claimStatusConfig={CLAIM_STATUS_CONFIG}
        onBulkAction={handleBulkAction}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      {/* Table */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", background: "#fff", overflow: "hidden" }}>
        <ClaimsMobileList>
          {loading ? (
            <div style={{ textAlign: "center", padding: "28px", color: "#9ca3af" }}><Loader2 className="animate-spin inline" size={20} /> Dang tai...</div>
          ) : claims.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px", color: "#9ca3af" }}>Khong co don nao</div>
          ) : (
            claims.map((c: any, idx: number) => {
              const daysPending = daysBetween(c.detectedDate);
              const daysLeft = c.deadline ? daysUntil(c.deadline) : Infinity;
              const issueConfig = ISSUE_TYPE_CONFIG[c.issueType] || ISSUE_TYPE_CONFIG.OTHER;
              const statusConfig = CLAIM_STATUS_CONFIG[c.claimStatus] || CLAIM_STATUS_CONFIG.PENDING;
              const completeAction = getCompleteToggleActionState(c.claimStatus, Boolean(c.isCompleted));

              return (
                <article
                  key={`${c.id}-mobile`}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "12px",
                    background: c.isCompleted ? "#f8fafc" : "#fff",
                    opacity: c.isCompleted ? 0.75 : 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <button
                        onClick={() => setDetailClaimId(c.id)}
                        style={{ background: "none", border: "none", padding: 0, color: "#2563EB", fontSize: "14px", fontWeight: 700, cursor: "pointer", textAlign: "left" }}
                      >
                        {c.order?.requestCode || "Khong ro ma"}
                      </button>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{c.order?.shopName || "Khong ro shop"}</div>
                    </div>
                    {canBulkSelect && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        style={{ accentColor: "#2563EB", cursor: "pointer" }}
                        aria-label={`Chon don ${c.order?.requestCode || idx + 1}`}
                      />
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-bold border ${issueConfig.bg} ${issueConfig.text} ${issueConfig.border}`}>
                      {issueConfig.label}
                    </span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                      {statusConfig.label}
                    </span>
                    <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-bold ${daysPending <= 7 ? "bg-green-100 text-green-700" : daysPending <= 14 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                      {daysPending}d
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div style={{ fontSize: "12px", color: "#475569" }}>
                      <div style={{ color: "#94a3b8", marginBottom: "2px" }}>Ma doi tac</div>
                      <strong>{c.order?.carrierOrderCode || "—"}</strong>
                    </div>
                    <div style={{ fontSize: "12px", color: "#475569" }}>
                      <div style={{ color: "#94a3b8", marginBottom: "2px" }}>COD</div>
                      <strong>{formatVND(c.order?.codAmount || 0)}</strong>
                    </div>
                    <div style={{ fontSize: "12px", color: "#475569" }}>
                      <div style={{ color: "#94a3b8", marginBottom: "2px" }}>Ngay phat hien</div>
                      <strong>{format(new Date(c.detectedDate), "dd/MM/yy")}</strong>
                    </div>
                    <div style={{ fontSize: "12px", color: "#475569" }}>
                      <div style={{ color: "#94a3b8", marginBottom: "2px" }}>Deadline</div>
                      <strong style={{ color: c.deadline ? (daysLeft < 0 ? "#dc2626" : daysLeft <= 3 ? "#d97706" : "#334155") : "#94a3b8" }}>
                        {c.deadline ? format(new Date(c.deadline), "dd/MM/yy") : "Chua dat"}
                      </strong>
                    </div>
                  </div>

                  <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.5" }}>
                    <div style={{ color: "#94a3b8", marginBottom: "2px" }}>Noi dung van de</div>
                    <div>{c.issueDescription || "Chua co noi dung"}</div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <button
                      onClick={() => setDetailClaimId(c.id)}
                      style={{ ...secondaryBtnStyle, padding: "6px 10px", color: "#2563EB", borderColor: "#bfdbfe", background: "#eff6ff" }}
                      aria-label={`Xem chi tiet ${c.order?.requestCode || ""}`}
                    >
                      <Eye size={12} /> Chi tiet
                    </button>
                    <button
                      onClick={() => setTrackingCode(c.order?.requestCode || "")}
                      style={{ ...secondaryBtnStyle, padding: "6px 10px" }}
                      aria-label={`Tra hanh trinh ${c.order?.requestCode || ""}`}
                    >
                      <Truck size={12} /> Track
                    </button>
                    {canUpdateClaim && (
                      <button
                        onClick={() => setProcessingPopup({ id: c.id, content: c.processingContent || "" })}
                        style={{ ...secondaryBtnStyle, padding: "6px 10px" }}
                        aria-label={`Cap nhat xu ly ${c.order?.requestCode || ""}`}
                      >
                        <FileText size={12} /> Xu ly
                      </button>
                    )}
                    {canUpdateClaim && (
                      <button
                        onClick={() => handleRequestCompleteToggle(c.id, c.order?.requestCode || "", Boolean(c.isCompleted))}
                        disabled={!completeAction.canToggle}
                        style={{ ...secondaryBtnStyle, padding: "6px 10px", opacity: completeAction.canToggle ? 1 : 0.5, cursor: completeAction.canToggle ? "pointer" : "not-allowed" }}
                        aria-label={completeAction.title}
                      >
                        {c.isCompleted ? <RotateCcw size={12} /> : <Check size={12} />} {c.isCompleted ? "Mo lai" : "Hoan tat"}
                      </button>
                    )}
                    {canDeleteClaim && (
                      <button
                        onClick={() => handleDelete(c.id, c.order?.requestCode || "")}
                        style={{ ...secondaryBtnStyle, padding: "6px 10px", color: "#dc2626", borderColor: "#fecaca", background: "#fef2f2" }}
                        aria-label={`Xoa ${c.order?.requestCode || ""}`}
                      >
                        <Trash2 size={12} /> Xoa
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </ClaimsMobileList>
        <ClaimsDesktopTable>
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
                    disabled={!canBulkSelect}
                    style={{ accentColor: "#2563EB", cursor: "pointer" }}
                    aria-label="Chon tat ca don khieu nai"
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
                  const completeAction = getCompleteToggleActionState(c.claimStatus, Boolean(c.isCompleted));

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
                          disabled={!canBulkSelect}
                          style={{ accentColor: "#2563EB", cursor: "pointer" }}
                          aria-label={`Chon don ${c.order?.requestCode || idx + 1}`}
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
                          style={{ outline: "none", appearance: "auto", maxWidth: "100%", opacity: canUpdateClaim ? 1 : 0.7, cursor: canUpdateClaim ? "pointer" : "not-allowed" }}
                          disabled={!canUpdateClaim}
                          aria-label={`Cap nhat loai van de ${c.order?.requestCode || idx + 1}`}
                        >
                          {Object.entries(ISSUE_TYPE_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      {/* 8. Nội Dung VĐ — INLINE EDITABLE, full-text display */}
                      <td style={{ padding: "6px", verticalAlign: "top" }}>
                        <div
                          contentEditable={canUpdateClaim}
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
                            cursor: canUpdateClaim ? "text" : "not-allowed",
                            transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
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
                          role="textbox"
                          aria-label={`Noi dung van de ${c.order?.requestCode || idx + 1}`}
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
                          disabled={!canUpdateClaim}
                        />
                      </td>
                      {/* 12. ND XL */}
                      <td style={{ padding: "6px" }}>
                        <button
                          onClick={() => setProcessingPopup({ id: c.id, content: c.processingContent || "" })}
                          disabled={!canUpdateClaim}
                          style={{
                            padding: "3px 6px", border: "1px solid #e5e7eb", borderRadius: "4px",
                            background: "#fff", cursor: canUpdateClaim ? "pointer" : "not-allowed", fontSize: "11px", color: "#6b7280",
                            display: "flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap",
                            opacity: canUpdateClaim ? 1 : 0.6,
                          }}
                          aria-label={`Cap nhat noi dung xu ly ${c.order?.requestCode || idx + 1}`}
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
                          disabled={!canUpdateClaim}
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
                            opacity: canUpdateClaim ? 1 : 0.7,
                          }}
                          aria-label={`Cap nhat deadline ${c.order?.requestCode || idx + 1}`}
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
                              onClick={() => handleRequestCompleteToggle(c.id, c.order?.requestCode || "", Boolean(c.isCompleted))}
                              disabled={!completeAction.canToggle}
                              className={`p-1 w-6 h-6 flex items-center justify-center rounded border border-transparent transition-colors ${completeAction.className}`}
                              title={completeAction.title}
                              style={{ opacity: completeAction.canToggle ? 1 : 0.45, cursor: completeAction.canToggle ? "pointer" : "not-allowed" }}
                            >
                              {c.isCompleted ? <RotateCcw size={12} /> : <Check size={12} />}
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
        </ClaimsDesktopTable>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 0 && (
        <div className="claims-pagination" style={{
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

      <ClaimDetailDrawer
        claimId={detailClaimId || ""}
        open={Boolean(detailClaimId)}
        onClose={() => setDetailClaimId(null)}
        onUpdate={fetchClaims}
        onAddTodo={handleOpenTodoFromClaim}
        onCompleteToggle={handleDrawerCompleteToggle}
        onDelete={handleDelete}
        onTrackOrder={(requestCode) => setTrackingCode(requestCode)}
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
        title={completeDialogCopy.title}
        description={completeDialogCopy.description}
        confirmLabel={completeDialogCopy.confirmLabel}
        cancelLabel={completeDialogCopy.cancelLabel}
        confirmColor="green"
        icon={<Check size={26} color="#16a34a" />}
        loading={completeConfirm?.loading}
        successMsg={completeConfirm?.success}
      />

      <ConfirmActionDialog
        open={Boolean(reopenConfirm)}
        onClose={() => setReopenConfirm(null)}
        onConfirm={executeReopen}
        title={reopenDialogCopy.title}
        description={reopenDialogCopy.description}
        confirmLabel={reopenDialogCopy.confirmLabel}
        cancelLabel={reopenDialogCopy.cancelLabel}
        confirmColor="orange"
        icon={<RotateCcw size={26} color="#d97706" />}
        loading={reopenConfirm?.loading}
        successMsg={reopenConfirm?.success}
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

export default memo(ClaimsClientInner);
