"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  CheckSquare,
  Clock,
  FileText,
  Loader2,
  Package,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { getUnsavedClaimDialogCopy } from "@/lib/confirm-dialog";
import {
  CLAIM_STATUS_CONFIG,
  DEFAULT_ISSUE_TYPE,
  ISSUE_TYPE_CONFIG,
} from "@/lib/claims-config";

const COMPLETION_STATUSES = ["RESOLVED", "CUSTOMER_COMPENSATED", "CUSTOMER_REJECTED"];

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9998,
  backgroundColor: "rgba(0,0,0,0.5)",
};

const closeBtnBase: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px",
  borderRadius: "6px",
  color: "#666",
  display: "flex",
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#FFFFFF",
  border: "1.5px solid #d1d5db",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  color: "#1a1a1a",
  outline: "none",
  boxSizing: "border-box",
};

const FIELD_LABEL_MAP: Record<string, string> = {
  claimStatus: "Trạng thái xử lý",
  issueType: "Loại vấn đề",
  issueDescription: "Nội dung vấn đề",
  processingContent: "Nội dung xử lý",
  carrierCompensation: "NVC đền bù",
  customerCompensation: "Đền bù KH",
  deadline: "Thời hạn",
};

export type ClaimDetailData = {
  id: string;
  issueType: string;
  claimStatus: string;
  isCompleted: boolean;
  detectedDate: string;
  issueDescription?: string | null;
  processingContent?: string | null;
  deadline?: string | null;
  carrierCompensation?: number | null;
  customerCompensation?: number | null;
  order?: {
    id?: string;
    requestCode?: string;
    carrierOrderCode?: string;
    shopName?: string;
    codAmount?: number;
    totalFee?: number;
    status?: string;
    pickupTime?: string | null;
    regionGroup?: string | null;
    internalNotes?: string | null;
  };
  statusHistory?: any[];
  changeLogs?: any[];
  [key: string]: any;
};

type ClaimDetailDrawerProps = {
  claimId: string;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onAddTodo?: (data: ClaimDetailData) => void;
  onCompleteToggle?: (claim: { id: string; requestCode: string; isCompleted: boolean }) => void;
  onDelete?: (id: string, requestCode: string) => void;
  onTrackOrder?: (requestCode: string) => void;
  baseZIndex?: number;
};

type LocalEdits = {
  issueType: string;
  issueDescription: string;
  deadline: string;
  claimStatus: string;
  processingContent: string;
  carrierCompensation: number;
  customerCompensation: number;
};

function formatVND(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function daysBetween(d: string | Date) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function toLocalEdits(data: any): LocalEdits {
  return {
    issueType: data.issueType || "",
    issueDescription: data.issueDescription || "",
    deadline: data.deadline ? new Date(data.deadline).toISOString().split("T")[0] : "",
    claimStatus: data.claimStatus || "",
    processingContent: data.processingContent || "",
    carrierCompensation: Number(data.carrierCompensation || 0),
    customerCompensation: Number(data.customerCompensation || 0),
  };
}

function computeIsDirty(edits: LocalEdits, original: any): boolean {
  const originalDeadline = original.deadline ? new Date(original.deadline).toISOString().split("T")[0] : "";
  return (
    edits.issueType !== (original.issueType || "")
    || edits.issueDescription !== (original.issueDescription || "")
    || edits.deadline !== originalDeadline
    || edits.claimStatus !== (original.claimStatus || "")
    || edits.processingContent !== (original.processingContent || "")
    || Number(edits.carrierCompensation) !== Number(original.carrierCompensation || 0)
    || Number(edits.customerCompensation) !== Number(original.customerCompensation || 0)
  );
}

function getDisplayValue(fieldName: string, value: string | null): string {
  if (!value) return "—";
  if (fieldName === "claimStatus") {
    return CLAIM_STATUS_CONFIG[value as keyof typeof CLAIM_STATUS_CONFIG]?.label || value;
  }
  if (fieldName === "issueType") {
    return ISSUE_TYPE_CONFIG[value as keyof typeof ISSUE_TYPE_CONFIG]?.label || value;
  }
  if (fieldName === "carrierCompensation" || fieldName === "customerCompensation") {
    return formatVND(parseFloat(value) || 0);
  }
  if (fieldName === "deadline") {
    try {
      return format(new Date(value), "dd/MM/yyyy");
    } catch {
      return value;
    }
  }
  return value.length > 50 ? `${value.slice(0, 50)}...` : value;
}

export function ClaimDetailDrawer({
  claimId,
  open,
  onClose,
  onUpdate,
  onAddTodo,
  onCompleteToggle,
  onDelete,
  onTrackOrder,
  baseZIndex = 9998,
}: ClaimDetailDrawerProps) {
  const [data, setData] = useState<ClaimDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [edits, setEdits] = useState<LocalEdits | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const fetchDetail = useCallback(() => {
    if (!claimId) return;
    setLoading(true);
    fetch(`/api/claims/${claimId}`)
      .then((response) => response.json())
      .then((result) => setData(result as ClaimDetailData))
      .finally(() => setLoading(false));
  }, [claimId]);

  useEffect(() => {
    if (open && claimId) {
      fetchDetail();
    }
  }, [claimId, fetchDetail, open]);

  useEffect(() => {
    if (data) {
      setEdits(toLocalEdits(data));
    }
  }, [data]);

  useEffect(() => {
    if (!open) {
      setShowDiscardConfirm(false);
    }
  }, [open]);

  const isDirty = Boolean(data && edits && computeIsDirty(edits, data));
  const canEditCarrierComp = edits?.claimStatus === "CARRIER_COMPENSATED";
  const canEditCustomerComp = ["CARRIER_COMPENSATED", "CARRIER_REJECTED", "CUSTOMER_COMPENSATED"].includes(
    edits?.claimStatus || ""
  );
  const canComplete = Boolean(data && COMPLETION_STATUSES.includes(data.claimStatus));
  const canToggleComplete = Boolean(data && (data.isCompleted || canComplete));
  const completeActionLabel = data?.isCompleted ? "K\u00E9o l\u1EA1i ch\u01B0a ho\u00E0n t\u1EA5t" : "Ho\u00E0n t\u1EA5t";
  const completeActionTitle = data?.isCompleted
    ? "K\u00E9o l\u1EA1i ch\u01B0a ho\u00E0n t\u1EA5t"
    : canComplete
      ? "Ho\u00E0n t\u1EA5t x\u1EED l\u00FD"
      : "Ch\u01B0a \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n ho\u00E0n t\u1EA5t";

  const setEdit = <K extends keyof LocalEdits>(field: K, value: LocalEdits[K]) => {
    setEdits((previous) => (previous ? { ...previous, [field]: value } : previous));
  };

  const handleSave = async () => {
    if (!data || !edits || !isDirty) return;

    const changes: Record<string, any> = {};
    if (edits.issueType !== (data.issueType || "")) changes.issueType = edits.issueType;
    if (edits.issueDescription !== (data.issueDescription || "")) changes.issueDescription = edits.issueDescription || null;

    const originalDeadline = data.deadline ? new Date(data.deadline).toISOString().split("T")[0] : "";
    if (edits.deadline !== originalDeadline) changes.deadline = edits.deadline || null;
    if (edits.claimStatus !== (data.claimStatus || "")) changes.claimStatus = edits.claimStatus;
    if (edits.processingContent !== (data.processingContent || "")) changes.processingContent = edits.processingContent || null;
    if (Number(edits.carrierCompensation) !== Number(data.carrierCompensation || 0)) {
      changes.carrierCompensation = Number(edits.carrierCompensation) || 0;
    }
    if (Number(edits.customerCompensation) !== Number(data.customerCompensation || 0)) {
      changes.customerCompensation = Number(edits.customerCompensation) || 0;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const result = await response.json();
      if (result.claim) {
        setData(result.claim);
      } else {
        fetchDetail();
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onUpdate?.();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (data) {
      setEdits(toLocalEdits(data));
    }
  };

  const handleClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  if (!open) return null;

  const discardCopy = getUnsavedClaimDialogCopy();

  const timeline: any[] = [];
  if (data?.statusHistory) {
    data.statusHistory.forEach((entry: any) => timeline.push({ type: "status", ...entry }));
  }
  if (data?.changeLogs) {
    data.changeLogs.forEach((entry: any) => {
      if (entry.fieldName !== "claimStatus") {
        timeline.push({ type: "change", ...entry });
      }
    });
  }
  timeline.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

  const sectionTitle = (icon: React.ReactNode, title: string) => (
    <h3
      style={{
        fontSize: "13px",
        fontWeight: 700,
        color: "#1e293b",
        marginBottom: "10px",
        display: "flex",
        alignItems: "center",
        gap: "7px",
        textTransform: "uppercase",
        letterSpacing: "0.03em",
      }}
    >
      {icon}
      {title}
    </h3>
  );

  const infoRow = (label: string, value: React.ReactNode) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "5px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span style={{ color: "#6b7280", fontSize: "12px" }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          fontSize: "12px",
          color: "#1e293b",
          textAlign: "right",
          maxWidth: "55%",
        }}
      >
        {value}
      </span>
    </div>
  );

  return createPortal(
    <>
      <div style={{ ...overlayStyle, zIndex: baseZIndex }} onClick={handleClose} />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(700px, 100vw)",
          zIndex: baseZIndex + 1,
          background: "#f8fafc",
          borderLeft: `2px solid ${isDirty ? "#f59e0b" : "#2563EB"}`,
          boxShadow: "-12px 0 40px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.25s ease-out",
          transition: "border-color 0.2s",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "6px", borderRadius: "8px", background: isDirty ? "#fef3c7" : "#eff6ff" }}>
              <ShieldAlert size={18} color={isDirty ? "#d97706" : "#2563EB"} />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                Chi tiết Đơn Có Vấn Đề
                {isDirty && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "99px",
                      background: "#fef3c7",
                      color: "#92400e",
                      border: "1px solid #fde68a",
                      letterSpacing: "0.02em",
                    }}
                  >
                    ● Chưa lưu
                  </span>
                )}
                {saveSuccess && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "99px",
                      background: "#dcfce7",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                    }}
                  >
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
                onClick={() => {
                  const requestCode = data.order?.requestCode;
                  if (requestCode && onTrackOrder) onTrackOrder(requestCode);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #6ee7b7",
                  background: "#ecfdf5",
                  color: "#059669",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Truck size={13} />
                Hành trình
              </button>
            )}
            {data && onAddTodo && (
              <button
                onClick={() => onAddTodo(data)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #93c5fd",
                  background: "#eff6ff",
                  color: "#2563EB",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <CheckSquare size={13} />
                Công Việc
              </button>
            )}
            {data && onCompleteToggle && (
              <button
                onClick={() => onCompleteToggle({
                  id: claimId,
                  requestCode: data.order?.requestCode || "",
                  isCompleted: Boolean(data.isCompleted),
                })}
                disabled={!canToggleComplete}
                title={completeActionTitle}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: data.isCompleted ? "1.5px solid #fde68a" : "1.5px solid #bbf7d0",
                  background: data.isCompleted ? "#fffbeb" : "#f0fdf4",
                  color: data.isCompleted ? "#d97706" : "#16a34a",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: canToggleComplete ? "pointer" : "default",
                  opacity: canToggleComplete ? 1 : 0.4,
                }}
              >
                {data.isCompleted ? <RotateCcw size={13} /> : <Check size={13} />}
                {completeActionLabel}
              </button>
            )}
            {data && onDelete && (
              <button
                onClick={() => onDelete(claimId, data.order?.requestCode || "")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid #fecaca",
                  background: "#fef2f2",
                  color: "#dc2626",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Trash2 size={13} />
                Xóa
              </button>
            )}
            <button
              onClick={handleClose}
              style={{
                ...closeBtnBase,
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>
              <Loader2 className="animate-spin inline" size={24} />
            </div>
          )}

          {data && edits && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
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
                  <span style={{ fontWeight: 500, fontSize: "12px", color: "#1e293b", whiteSpace: "pre-wrap" }}>
                    {data.order?.internalNotes || "—"}
                  </span>
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: "10px", padding: "16px 18px", border: "1px solid #fde68a" }}>
                {sectionTitle(<AlertTriangle size={14} color="#d97706" />, "Thông tin vấn đề")}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>Loại vấn đề</label>
                    <select
                      value={edits.issueType}
                      onChange={(event) => setEdit("issueType", event.target.value)}
                      style={{ ...inputStyle, fontSize: "13px", padding: "7px 10px", cursor: "pointer" }}
                    >
                      {Object.entries(ISSUE_TYPE_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>Nội dung vấn đề</label>
                    <textarea
                      value={edits.issueDescription}
                      onChange={(event) => setEdit("issueDescription", event.target.value)}
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
                      onChange={(event) => setEdit("deadline", event.target.value)}
                      style={{ ...inputStyle, fontSize: "13px", padding: "7px 10px" }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: "10px", padding: "16px 18px", border: "1px solid #bbf7d0" }}>
                {sectionTitle(<FileText size={14} color="#16a34a" />, "Xử lý")}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>Trạng thái xử lý</label>
                    <select
                      value={edits.claimStatus}
                      onChange={(event) => setEdit("claimStatus", event.target.value)}
                      style={{ ...inputStyle, fontSize: "13px", padding: "7px 10px", cursor: "pointer" }}
                    >
                      {Object.entries(CLAIM_STATUS_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600, display: "block", marginBottom: "3px" }}>Nội dung xử lý</label>
                    <textarea
                      value={edits.processingContent}
                      onChange={(event) => setEdit("processingContent", event.target.value)}
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
                          min={0}
                          value={edits.carrierCompensation}
                          onChange={(event) => setEdit("carrierCompensation", parseFloat(event.target.value) || 0)}
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
                          min={0}
                          value={edits.customerCompensation}
                          onChange={(event) => setEdit("customerCompensation", parseFloat(event.target.value) || 0)}
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

              <div style={{ background: "#fff", borderRadius: "10px", padding: "16px 18px", border: "1px solid #e5e7eb" }}>
                {sectionTitle(<Clock size={14} color="#6366f1" />, "Lịch sử thay đổi")}
                {timeline.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "16px", color: "#9ca3af", fontSize: "12px" }}>Chưa có lịch sử</div>
                ) : (
                  <div style={{ borderLeft: "2px solid #e2e8f0", paddingLeft: "16px", marginLeft: "6px" }}>
                    {timeline.map((item, index) => (
                      <div key={item.id} style={{ position: "relative", marginBottom: "14px" }}>
                        <div
                          style={{
                            position: "absolute",
                            left: "-23px",
                            top: "3px",
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: index === 0 ? (item.type === "status" ? "#2563EB" : "#8b5cf6") : "#e2e8f0",
                            border: `2px solid ${index === 0 ? (item.type === "status" ? "#2563EB" : "#8b5cf6") : "#d1d5db"}`,
                          }}
                        />
                        {item.type === "status" ? (
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "#1e293b" }}>
                            <span style={{ color: "#6b7280", fontWeight: 400 }}>TT Xử lý → </span>
                            {CLAIM_STATUS_CONFIG[item.toStatus as keyof typeof CLAIM_STATUS_CONFIG]?.label || item.toStatus}
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

        {data && edits && (
          <div
            style={{
              padding: "12px 16px",
              background: "#fff",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "flex-end",
            }}
          >
            {isDirty && (
              <button
                onClick={handleReset}
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid #d1d5db",
                  background: "#fff",
                  color: "#6b7280",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={13} />
                Hoàn tác
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "8px",
                border: isDirty ? "1.5px solid #2563EB" : "1.5px solid #d1d5db",
                background: isDirty ? "#2563EB" : "#f9fafb",
                color: isDirty ? "#fff" : "#9ca3af",
                fontSize: "13px",
                fontWeight: 700,
                cursor: isDirty ? "pointer" : "default",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
              {saving ? "Đang lưu..." : isDirty ? "Lưu thay đổi" : "Không có thay đổi"}
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={showDiscardConfirm}
        title={discardCopy.title}
        description={discardCopy.description}
        confirmLabel={discardCopy.confirmLabel}
        cancelLabel={discardCopy.cancelLabel}
        tone={discardCopy.tone}
        icon={<AlertTriangle size={24} />}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          onClose();
        }}
      />
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </>,
    document.body
  );
}
