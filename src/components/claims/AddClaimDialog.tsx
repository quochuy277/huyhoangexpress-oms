"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Check, ExternalLink, Loader2, Plus, Search, X } from "lucide-react";

import {
  CLAIM_STATUS_CONFIG,
  ISSUE_TYPE_CONFIG,
  formatClaimMoney,
} from "@/lib/claims-config";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

const ClaimDetailDrawer = dynamic(
  () => import("@/components/claims/ClaimDetailDrawer").then((module) => ({
    default: module.ClaimDetailDrawer,
  })),
  { loading: () => null },
);

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
  background: "#FFFFFF",
  border: "1.5px solid #2563EB",
  borderRadius: "12px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
  padding: "0",
  display: "flex",
  flexDirection: "column",
  maxHeight: "90vh",
  maxWidth: "calc(100vw - 32px)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #e5e7eb",
  padding: "16px 24px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#1a1a1a",
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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "6px",
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

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  borderTop: "1px solid #e5e7eb",
  padding: "16px 24px",
};

const primaryBtnStyle: React.CSSProperties = {
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

type AddClaimDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillOrder?: any;
};

export function AddClaimDialog({
  open,
  onClose,
  onSuccess,
  prefillOrder,
}: AddClaimDialogProps) {
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
  const { confirm, element: confirmDialog } = useConfirmDialog();

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

  const doSearch = useCallback((query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    fetch(`/api/claims/search-orders?q=${encodeURIComponent(query)}`)
      .then((response) => response.json())
      .then((data) => setResults(data.orders || []))
      .finally(() => setSearching(false));
  }, []);

  const onSearchChange = (value: string) => {
    setSearchQ(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSave = async () => {
    if (!selected || !issueType) {
      setError("Vui lòng chọn loại vấn đề");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/claims", {
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

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          setError(data.error || "Đơn đã có trong Đơn có vấn đề.");
          const confirmed = await confirm({
            title: "Đơn đã tồn tại",
            description: `Đơn ${selected.requestCode || "này"} đã có trong Đơn có vấn đề. Bạn có muốn mở chi tiết đơn hiện có để sửa lại không?`,
            confirmLabel: "Mở chi tiết",
            cancelLabel: "Đóng",
            tone: "info",
            icon: <ExternalLink size={26} />,
          });
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

  if (!open) {
    return null;
  }

  return createPortal(
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div style={{ ...dialogBase, width: `min(${step === "search" ? "560px" : "640px"}, calc(100vw - 32px))` }}>
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "8px", background: "#eff6ff" }}>
              <Plus size={18} color="#2563EB" />
            </div>
            <span style={titleStyle}>
              {step === "search" ? "Tìm đơn hàng" : "Thêm vào Đơn có vấn đề"}
            </span>
          </div>
          <button style={closeBtnBase} onClick={onClose} aria-label="Đóng hộp thoại thêm đơn có vấn đề">
            <X size={18} />
          </button>
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
                  onChange={(event) => onSearchChange(event.target.value)}
                  autoFocus
                  aria-label="Tìm đơn hàng để thêm vào đơn có vấn đề"
                />
              </div>
              <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#64748b", lineHeight: "1.5" }}>
                Mặc định chỉ tìm trong 30 ngày gần nhất. Khi nhập đúng mã yêu cầu, mã đối tác
                hoặc SĐT đầy đủ, hệ thống sẽ tìm toàn bộ lịch sử.
              </p>
              {searching && (
                <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
                  <Loader2 className="animate-spin inline" size={18} /> Đang tìm...
                </div>
              )}
              {results.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {results.map((order: any) => (
                    <button
                      key={order.id}
                      onClick={() => {
                        setSelected(order);
                        setStep("form");
                      }}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        background: "#fff",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.borderColor = "#2563EB";
                        event.currentTarget.style.background = "#f8faff";
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.borderColor = "#e5e7eb";
                        event.currentTarget.style.background = "#fff";
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "#1a1a1a" }}>{order.requestCode}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                          {order.shopName} - {order.carrierName}
                        </div>
                        {order.existingClaim && (
                          <div style={{ fontSize: "11px", color: "#b45309", marginTop: "4px", fontWeight: 600 }}>
                            Đã có trong Đơn có vấn đề {order.existingClaim.isCompleted ? "(đã hoàn tất)" : "(chưa hoàn tất)"}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#059669" }}>
                        {formatClaimMoney(order.codAmount)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {searchQ.length >= 2 && !searching && results.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af", fontSize: "13px" }}>
                  Không tìm thấy đơn hàng nào
                </div>
              )}
            </>
          )}

          {step === "form" && selected && (
            <>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "14px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px" }}
                  className="resp-grid-1-2"
                >
                  <div><span style={{ color: "#6b7280" }}>Mã YC: </span><strong>{selected.requestCode}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>Đối tác: </span><strong>{selected.carrierName}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>Shop: </span><strong>{selected.shopName}</strong></div>
                  <div><span style={{ color: "#6b7280" }}>COD: </span><strong style={{ color: "#059669" }}>{formatClaimMoney(selected.codAmount)}</strong></div>
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

              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}
                className="resp-grid-1-2"
              >
                <div>
                  <label style={labelStyle}>Loại vấn đề *</label>
                  <select
                    style={inputStyle}
                    value={issueType}
                    onChange={(event) => setIssueType(event.target.value)}
                    aria-label="Loại vấn đề của đơn"
                  >
                    <option value="">— Chọn —</option>
                    {Object.entries(ISSUE_TYPE_CONFIG).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Trạng thái xử lý</label>
                  <select
                    style={inputStyle}
                    value={claimStatus}
                    onChange={(event) => setClaimStatus(event.target.value)}
                    aria-label="Trạng thái xử lý đơn có vấn đề"
                  >
                    {Object.entries(CLAIM_STATUS_CONFIG).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Nội dung vấn đề</label>
                <textarea
                  style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
                  value={issueDesc}
                  onChange={(event) => setIssueDesc(event.target.value)}
                  placeholder="Mô tả vấn đề..."
                  aria-label="Nội dung vấn đề của đơn"
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>Thời hạn</label>
                <input
                  style={inputStyle}
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  aria-label="Thời hạn xử lý đơn có vấn đề"
                />
              </div>
            </>
          )}
        </div>

        {step === "form" && (
          <div style={footerStyle}>
            <button
              style={{ ...primaryBtnStyle, background: "transparent", color: "#374151", border: "1px solid #d1d5db" }}
              onClick={() => {
                if (!prefillOrder) {
                  setStep("search");
                  setSelected(null);
                  return;
                }

                onClose();
              }}
            >
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
        open={Boolean(duplicateClaimId)}
        onClose={() => setDuplicateClaimId(null)}
        onUpdate={onSuccess}
      />

      {confirmDialog}
    </>,
    document.body,
  );
}
