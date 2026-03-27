"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Loader2, Plus, RotateCcw, Trash2, X } from "lucide-react";

import { ClaimDetailDrawer, type ClaimDetailData } from "@/components/claims/ClaimDetailDrawer";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TrackingPopup } from "@/components/tracking/TrackingPopup";
import {
  getClaimCompleteDialogCopy,
  getClaimDeleteDialogCopy,
  getClaimReopenDialogCopy,
  getDuplicateClaimDialogCopy,
} from "@/lib/confirm-dialog";
import {
  CLAIM_STATUS_CONFIG,
  CLAIM_STATUS_OPTIONS,
  ISSUE_TYPE_CONFIG,
  ISSUE_TYPE_OPTIONS,
} from "@/lib/claims-config";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9998,
  backgroundColor: "rgba(0,0,0,0.5)",
};

const dialogBase: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 9999,
  width: "560px",
  maxWidth: "calc(100vw - 32px)",
  background: "#FFFFFF",
  border: "1.5px solid #2563EB",
  borderRadius: "12px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
  display: "flex",
  flexDirection: "column",
  maxHeight: "90vh",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #e5e7eb",
  padding: "16px 24px",
};

const titleStyle: React.CSSProperties = { fontSize: "18px", fontWeight: 700, color: "#1a1a1a" };

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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "6px",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  borderTop: "1px solid #e5e7eb",
  padding: "16px 24px",
};

const primaryBtn: React.CSSProperties = {
  background: "#2563EB",
  color: "#FFFFFF",
  border: "none",
  padding: "8px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

interface OrderForClaim {
  id: string;
  requestCode: string;
  carrierName?: string | null;
  shopName?: string | null;
  codAmount: number;
  totalFee?: number;
  status?: string;
}

type DuplicateClaimPrompt = {
  claimId: string;
  requestCode: string;
};

type ClaimActionDialogState = {
  id: string;
  requestCode: string;
  loading: boolean;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  order?: OrderForClaim;
  source?: string;
  baseZIndex?: number;
}


function getTodoSource(source: string) {
  return source === "FROM_RETURNS" ? "FROM_RETURNS" : "FROM_ORDERS";
}

function getClaimTodoDescription(claim: ClaimDetailData) {
  return `Đơn: ${claim.order?.requestCode || ""} - Shop: ${claim.order?.shopName || ""} - Loại VĐ: ${ISSUE_TYPE_CONFIG[claim.issueType as keyof typeof ISSUE_TYPE_CONFIG]?.label || claim.issueType || ""} - TT: ${CLAIM_STATUS_CONFIG[claim.claimStatus as keyof typeof CLAIM_STATUS_CONFIG]?.label || claim.claimStatus || ""}`;
}

export function AddClaimFromPageDialog({
  open,
  onClose,
  onSuccess,
  order,
  source = "FROM_ORDERS",
  baseZIndex = 9998,
}: Props) {
  const [issueType, setIssueType] = useState("");
  const [claimStatus, setClaimStatus] = useState("PENDING");
  const [issueDesc, setIssueDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicateClaimId, setDuplicateClaimId] = useState<string | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<DuplicateClaimPrompt | null>(null);
  const [claimTodo, setClaimTodo] = useState<ClaimDetailData | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState<ClaimActionDialogState | null>(null);
  const [reopenConfirm, setReopenConfirm] = useState<ClaimActionDialogState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ClaimActionDialogState | null>(null);
  const [claimRefreshToken, setClaimRefreshToken] = useState(0);

  useEffect(() => {
    if (!open) {
      setIssueType("");
      setClaimStatus("PENDING");
      setIssueDesc("");
      setDeadline("");
      setError("");
      setDuplicateClaimId(null);
      setDuplicatePrompt(null);
      setClaimTodo(null);
      setTrackingCode(null);
      setCompleteConfirm(null);
      setReopenConfirm(null);
      setDeleteConfirm(null);
      setClaimRefreshToken(0);
    }
  }, [open]);

  const handleDuplicateClaim = (payload: any) => {
    const claimId = payload?.claim?.id;
    if (!claimId) {
      setError(payload?.error || "Đơn đã có trong Đơn có vấn đề.");
      return;
    }

    setError("");
    setDuplicatePrompt({
      claimId,
      requestCode: order?.requestCode || payload?.claim?.requestCode || "đơn này",
    });
  };

  const handleSave = async () => {
    if (!order || !issueType) {
      setError("Vui lòng chọn Loại Vấn Đề");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          issueType,
          claimStatus,
          issueDescription: issueDesc || null,
          deadline: deadline || null,
          source,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          handleDuplicateClaim(payload);
          return;
        }
        setError(payload.error || "Lỗi");
        return;
      }

      onSuccess?.();
      onClose();
    } catch {
      setError("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  };

  const handleClaimCompleteToggle = ({
    id,
    requestCode,
    isCompleted,
  }: {
    id: string;
    requestCode: string;
    isCompleted: boolean;
  }) => {
    if (isCompleted) {
      setReopenConfirm({ id, requestCode, loading: false });
      return;
    }

    setCompleteConfirm({ id, requestCode, loading: false });
  };

  const executeComplete = async () => {
    if (!completeConfirm) return;

    setCompleteConfirm((previous) => (previous ? { ...previous, loading: true } : previous));
    try {
      const response = await fetch(`/api/claims/${completeConfirm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });

      if (!response.ok) {
        setCompleteConfirm((previous) => (previous ? { ...previous, loading: false } : previous));
        return;
      }

      setCompleteConfirm(null);
      setClaimRefreshToken((previous) => previous + 1);
      onSuccess?.();
    } catch {
      setCompleteConfirm((previous) => (previous ? { ...previous, loading: false } : previous));
    }
  };

  const executeReopen = async () => {
    if (!reopenConfirm) return;

    setReopenConfirm((previous) => (previous ? { ...previous, loading: true } : previous));
    try {
      const response = await fetch(`/api/claims/${reopenConfirm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: false }),
      });

      if (!response.ok) {
        setReopenConfirm((previous) => (previous ? { ...previous, loading: false } : previous));
        return;
      }

      setReopenConfirm(null);
      setClaimRefreshToken((previous) => previous + 1);
      onSuccess?.();
    } catch {
      setReopenConfirm((previous) => (previous ? { ...previous, loading: false } : previous));
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;

    setDeleteConfirm((previous) => (previous ? { ...previous, loading: true } : previous));
    try {
      const response = await fetch(`/api/claims/${deleteConfirm.id}`, { method: "DELETE" });
      if (!response.ok) {
        setDeleteConfirm((previous) => (previous ? { ...previous, loading: false } : previous));
        return;
      }

      setDeleteConfirm(null);
      setDuplicateClaimId(null);
      onSuccess?.();
    } catch {
      setDeleteConfirm((previous) => (previous ? { ...previous, loading: false } : previous));
    }
  };

  if (!open || !order) return null;

  const duplicateCopy = duplicatePrompt ? getDuplicateClaimDialogCopy(duplicatePrompt.requestCode) : null;
  const completeDialogCopy = getClaimCompleteDialogCopy(completeConfirm?.requestCode || "");
  const reopenDialogCopy = getClaimReopenDialogCopy(reopenConfirm?.requestCode || "");
  const deleteDialogCopy = getClaimDeleteDialogCopy(deleteConfirm?.requestCode || "");
  const dialogZIndex = baseZIndex;
  const claimDrawerZIndex = baseZIndex + 20;

  return createPortal(
    <>
      <div style={{ ...overlayStyle, zIndex: dialogZIndex }} onClick={onClose} />
      <div style={{ ...dialogBase, zIndex: dialogZIndex + 1 }}>
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "8px", background: "#eff6ff" }}>
              <Plus size={18} color="#2563EB" />
            </div>
            <span style={titleStyle}>Chuyển vào Đơn Có Vấn Đề</span>
          </div>
          <button
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", color: "#666", display: "flex" }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }} className="resp-grid-1-2">
              <div><span style={{ color: "#6b7280" }}>Mã YC: </span><strong>{order.requestCode}</strong></div>
              <div><span style={{ color: "#6b7280" }}>Đối tác: </span><strong>{order.carrierName || "—"}</strong></div>
              <div><span style={{ color: "#6b7280" }}>Shop: </span><strong>{order.shopName || "—"}</strong></div>
              <div><span style={{ color: "#6b7280" }}>COD: </span><strong style={{ color: "#059669" }}>{order.codAmount?.toLocaleString("vi-VN")}đ</strong></div>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "12px",
                color: "#dc2626",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }} className="resp-grid-1-2">
            <div>
              <label style={labelStyle}>Loại Vấn Đề *</label>
              <select style={inputStyle} value={issueType} onChange={(event) => setIssueType(event.target.value)}>
                <option value="">— Chọn —</option>
                {ISSUE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Trạng Thái XL</label>
              <select style={inputStyle} value={claimStatus} onChange={(event) => setClaimStatus(event.target.value)}>
                {CLAIM_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Nội Dung Vấn Đề</label>
            <textarea
              style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
              value={issueDesc}
              onChange={(event) => setIssueDesc(event.target.value)}
              placeholder="Mô tả vấn đề..."
            />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <label style={labelStyle}>Thời Hạn</label>
            <input style={inputStyle} type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
          </div>
        </div>

        <div style={footerStyle}>
          <button style={{ ...primaryBtn, background: "transparent", color: "#374151", border: "1px solid #d1d5db" }} onClick={onClose}>Hủy</button>
          <button style={primaryBtn} onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
            Lưu
          </button>
        </div>
      </div>

      {duplicateCopy && (
        <ConfirmDialog
          open={Boolean(duplicatePrompt)}
          title={duplicateCopy.title}
          description={duplicateCopy.description}
          confirmLabel={duplicateCopy.confirmLabel}
          cancelLabel={duplicateCopy.cancelLabel}
          tone={duplicateCopy.tone}
          icon={<AlertTriangle size={24} />}
          onClose={() => setDuplicatePrompt(null)}
          onConfirm={() => {
            setDuplicateClaimId(duplicatePrompt!.claimId);
            setDuplicatePrompt(null);
          }}
        />
      )}

      <ClaimDetailDrawer
        claimId={duplicateClaimId || ""}
        open={Boolean(duplicateClaimId)}
        onClose={() => setDuplicateClaimId(null)}
        onUpdate={onSuccess}
        onAddTodo={setClaimTodo}
        onCompleteToggle={handleClaimCompleteToggle}
        onDelete={(id, requestCode) => setDeleteConfirm({ id, requestCode, loading: false })}
        onTrackOrder={setTrackingCode}
        baseZIndex={claimDrawerZIndex}
        refreshToken={claimRefreshToken}
      />

      {claimTodo && (
        <AddTodoDialog
          open={Boolean(claimTodo)}
          onClose={() => setClaimTodo(null)}
          defaultTitle={`Xử lý đơn ${claimTodo.order?.requestCode || ""}`}
          defaultDescription={getClaimTodoDescription(claimTodo)}
          defaultPriority="MEDIUM"
          linkedOrderId={claimTodo.order?.id}
          source={getTodoSource(source)}
        />
      )}

      <TrackingPopup
        requestCode={trackingCode || ""}
        isOpen={Boolean(trackingCode)}
        onClose={() => setTrackingCode(null)}
      />

      <ConfirmDialog
        open={Boolean(completeConfirm)}
        title={completeDialogCopy.title}
        description={completeDialogCopy.description}
        confirmLabel={completeDialogCopy.confirmLabel}
        cancelLabel={completeDialogCopy.cancelLabel}
        tone={completeDialogCopy.tone}
        icon={<Check size={24} />}
        loading={Boolean(completeConfirm?.loading)}
        onClose={() => setCompleteConfirm(null)}
        onConfirm={executeComplete}
      />

      <ConfirmDialog
        open={Boolean(reopenConfirm)}
        title={reopenDialogCopy.title}
        description={reopenDialogCopy.description}
        confirmLabel={reopenDialogCopy.confirmLabel}
        cancelLabel={reopenDialogCopy.cancelLabel}
        tone={reopenDialogCopy.tone}
        icon={<RotateCcw size={24} />}
        loading={Boolean(reopenConfirm?.loading)}
        onClose={() => setReopenConfirm(null)}
        onConfirm={executeReopen}
      />

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title={deleteDialogCopy.title}
        description={deleteDialogCopy.description}
        confirmLabel={deleteDialogCopy.confirmLabel}
        cancelLabel={deleteDialogCopy.cancelLabel}
        tone={deleteDialogCopy.tone}
        icon={<Trash2 size={24} />}
        loading={Boolean(deleteConfirm?.loading)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={executeDelete}
      />
    </>,
    document.body
  );
}
