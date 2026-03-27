"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Plus, X } from "lucide-react";

import { ClaimDetailDrawer } from "@/components/claims/ClaimDetailDrawer";
import { CLAIM_STATUS_OPTIONS, ISSUE_TYPE_OPTIONS } from "@/lib/claims-config";

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

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  order?: OrderForClaim;
  source?: string;
}

export function AddClaimFromPageDialog({ open, onClose, onSuccess, order, source = "FROM_ORDERS" }: Props) {
  const [issueType, setIssueType] = useState("");
  const [claimStatus, setClaimStatus] = useState("PENDING");
  const [issueDesc, setIssueDesc] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicateClaimId, setDuplicateClaimId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setIssueType("");
      setClaimStatus("PENDING");
      setIssueDesc("");
      setDeadline("");
      setError("");
      setDuplicateClaimId(null);
    }
  }, [open]);

  const handleDuplicateClaim = (payload: any) => {
    setError(payload?.error || "Đơn đã có trong đơn có vấn đề.");
    const requestCode = order?.requestCode || payload?.claim?.requestCode || "đơn này";
    const confirmed = window.confirm(
      `Đơn ${requestCode} đã có trong Đơn có vấn đề. Bạn có muốn mở chi tiết đơn hiện có để sửa lại không?`
    );
    if (confirmed && payload?.claim?.id) {
      setDuplicateClaimId(payload.claim.id);
    }
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

  if (!open || !order) return null;

  return createPortal(
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={dialogBase}>
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

      <ClaimDetailDrawer
        claimId={duplicateClaimId || ""}
        open={Boolean(duplicateClaimId)}
        onClose={() => setDuplicateClaimId(null)}
        onUpdate={onSuccess}
      />
    </>,
    document.body
  );
}
