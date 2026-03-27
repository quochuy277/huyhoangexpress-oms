"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Loader2,
  Package,
  CreditCard,
  Truck,
  User,
  MapPin,
  FileText,
  AlertTriangle,
  Check,
  CheckSquare,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { ClaimDetailDrawer, type ClaimDetailData } from "@/components/claims/ClaimDetailDrawer";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { AddClaimFromPageDialog } from "@/components/shared/AddClaimFromPageDialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TrackingPopup } from "@/components/tracking/TrackingPopup";
import {
  getClaimCompleteDialogCopy,
  getClaimDeleteDialogCopy,
  getClaimReopenDialogCopy,
} from "@/lib/confirm-dialog";
import {
  CLAIM_STATUS_CONFIG,
  DEFAULT_ISSUE_TYPE,
  ISSUE_TYPE_CONFIG,
} from "@/lib/claims-config";

function fmtVND(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toLocaleString("vi-VN")}đ`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateOnly(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  PICKED_UP: "bg-blue-100 text-blue-700",
  IN_TRANSIT: "bg-indigo-100 text-indigo-700",
  DELIVERING: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-green-100 text-green-700",
  RECONCILED: "bg-emerald-100 text-emerald-700",
  RETURNED_FULL: "bg-orange-100 text-orange-700",
  RETURNED_PARTIAL: "bg-amber-100 text-amber-700",
  RETURN_DELAYED: "bg-red-100 text-red-700",
  DELIVERY_DELAYED: "bg-rose-100 text-rose-700",
  CANCELLED: "bg-gray-100 text-gray-700",
  PENDING: "bg-slate-100 text-slate-700",
};

const STATUS_LABELS: Record<string, string> = {
  PICKED_UP: "Đã lấy hàng",
  IN_TRANSIT: "Đang vận chuyển",
  DELIVERING: "Đang giao",
  DELIVERED: "Đã giao",
  RECONCILED: "Đã đối soát",
  RETURNED_FULL: "Hoàn toàn bộ",
  RETURNED_PARTIAL: "Hoàn một phần",
  RETURN_DELAYED: "Hoãn trả hàng",
  DELIVERY_DELAYED: "Hoãn giao",
  CANCELLED: "Đã hủy",
  PENDING: "Chờ xử lý",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9998,
  backgroundColor: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(2px)",
};

const actionBtnStyle = (border: string, bg: string, color: string): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "5px",
  padding: "8px 14px",
  borderRadius: "8px",
  border: `1.5px solid ${border}`,
  background: bg,
  color,
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
});

interface Props {
  requestCode: string | null;
  open: boolean;
  onClose: () => void;
  userRole: string;
  baseZIndex?: number;
}

type ClaimActionDialogState = {
  id: string;
  requestCode: string;
  loading: boolean;
};

type Field = {
  label: string;
  value: ReactNode;
  highlight?: boolean;
  green?: boolean;
  mono?: boolean;
};

type Section = {
  title: string;
  icon: any;
  fields: Field[];
};


function getClaimTodoDescription(claim: ClaimDetailData) {
  return `Đơn: ${claim.order?.requestCode || ""} - Shop: ${claim.order?.shopName || ""} - Loại VĐ: ${ISSUE_TYPE_CONFIG[claim.issueType as keyof typeof ISSUE_TYPE_CONFIG]?.label || claim.issueType || ""} - TT: ${CLAIM_STATUS_CONFIG[claim.claimStatus as keyof typeof CLAIM_STATUS_CONFIG]?.label || claim.claimStatus || ""}`;
}

function renderFieldValue(value: ReactNode) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return value;
}

export function OrderDetailDialog({ requestCode, open, onClose, userRole, baseZIndex = 9998 }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showClaim, setShowClaim] = useState(false);
  const [showTodo, setShowTodo] = useState(false);
  const [showTracking, setShowTracking] = useState(false);
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [claimTodo, setClaimTodo] = useState<ClaimDetailData | null>(null);
  const [claimTrackingCode, setClaimTrackingCode] = useState<string | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState<ClaimActionDialogState | null>(null);
  const [reopenConfirm, setReopenConfirm] = useState<ClaimActionDialogState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ClaimActionDialogState | null>(null);
  const [claimRefreshToken, setClaimRefreshToken] = useState(0);

  const ORDER_DIALOG_Z_INDEX = baseZIndex;
  const CLAIM_DRAWER_Z_INDEX = baseZIndex + 20;
  const isStaffOrViewer = userRole === "STAFF" || userRole === "VIEWER";

  const fetchOrder = useCallback(async () => {
    if (!requestCode) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${requestCode}/detail`);
      if (!response.ok) {
        throw new Error("Không tìm thấy đơn hàng");
      }

      const json = await response.json();
      setData(json);
    } catch (cause: any) {
      setError(cause.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [requestCode]);

  useEffect(() => {
    if (open && requestCode) {
      setData(null);
      fetchOrder();
    }
  }, [open, requestCode, fetchOrder]);

  useEffect(() => {
    if (!open) {
      setShowClaim(false);
      setShowTodo(false);
      setShowTracking(false);
      setActiveClaimId(null);
      setClaimTodo(null);
      setClaimTrackingCode(null);
      setCompleteConfirm(null);
      setReopenConfirm(null);
      setDeleteConfirm(null);
      setClaimRefreshToken(0);
    }
  }, [open]);

  const handleClaimCompleteToggle = ({
    id,
    requestCode: claimRequestCode,
    isCompleted,
  }: {
    id: string;
    requestCode: string;
    isCompleted: boolean;
  }) => {
    if (isCompleted) {
      setReopenConfirm({ id, requestCode: claimRequestCode, loading: false });
      return;
    }

    setCompleteConfirm({ id, requestCode: claimRequestCode, loading: false });
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
      fetchOrder();
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
      fetchOrder();
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
      setActiveClaimId(null);
      fetchOrder();
    } catch {
      setDeleteConfirm((previous) => (previous ? { ...previous, loading: false } : previous));
    }
  };

  if (!open || !requestCode) return null;

  const order = data;
  const statusColor = order ? (STATUS_COLORS[order.deliveryStatus] || "bg-gray-100 text-gray-700") : "";
  const statusLabel = order ? (STATUS_LABELS[order.deliveryStatus] || order.deliveryStatus) : "";
  const issueTypeConfig = order?.claimOrder
    ? ISSUE_TYPE_CONFIG[order.claimOrder.issueType as keyof typeof ISSUE_TYPE_CONFIG] || ISSUE_TYPE_CONFIG[DEFAULT_ISSUE_TYPE]
    : null;
  const sections: Section[] = order ? [
    {
      title: "Thông Tin Đơn Hàng",
      icon: Package,
      fields: [
        {
          label: "Mã Yêu Cầu",
          value: (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace" }}>{order.requestCode}</span>
              {issueTypeConfig && order.claimOrder?.id && (
                <button
                  type="button"
                  onClick={() => setActiveClaimId(order.claimOrder.id)}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${issueTypeConfig.bg} ${issueTypeConfig.text} ${issueTypeConfig.border}`}
                  title={`Loại vấn đề: ${issueTypeConfig.fullLabel}`}
                >
                  {issueTypeConfig.label}
                </button>
              )}
            </div>
          ),
        },
        { label: "Mã Đơn KH", value: order.customerOrderCode },
        { label: "Shop", value: order.shopName },
        { label: "Trạng Thái Gốc", value: order.status },
        { label: "Ngày Tạo", value: fmtDate(order.createdTime) },
        { label: "Ngày Lấy Hàng", value: fmtDate(order.pickupTime) },
        { label: "Ngày Giao Hàng", value: fmtDate(order.deliveredDate) },
        { label: "Cập Nhật Cuối", value: fmtDate(order.lastUpdated) },
        { label: "Nguồn Đơn", value: order.orderSource },
        { label: "NV Kinh Doanh", value: order.salesStaff },
        { label: "Loại Đơn", value: order.partialOrderType },
        { label: "Mã Đơn Bộ Phận", value: order.partialOrderCode },
      ],
    },
    {
      title: "Tài Chính",
      icon: CreditCard,
      fields: [
        { label: "COD", value: fmtVND(order.codAmount), highlight: true },
        { label: "COD Gốc", value: fmtVND(order.codOriginal) },
        { label: "Giá Trị Khai Báo", value: fmtVND(order.declaredValue) },
        { label: "Phí Ship", value: fmtVND(order.shippingFee) },
        { label: "Phụ Phí", value: fmtVND(order.surcharge) },
        { label: "Phí Quá Cân", value: fmtVND(order.overweightFee) },
        { label: "Phí Bảo Hiểm", value: fmtVND(order.insuranceFee) },
        { label: "Phí Dịch Vụ COD", value: fmtVND(order.codServiceFee) },
        { label: "Phí Hoàn", value: fmtVND(order.returnFee) },
        { label: "Tổng Phí", value: fmtVND(order.totalFee), highlight: true },
        ...(!isStaffOrViewer ? [
          { label: "Phí Đối Tác Thu", value: fmtVND(order.carrierFee) },
          { label: "Phí BH GHSV", value: fmtVND(order.ghsvInsuranceFee) },
          {
            label: "Doanh Thu",
            value: ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"].includes(order.deliveryStatus) ? fmtVND(order.revenue) : "—",
            highlight: true,
            green: true,
          },
        ] : []),
        { label: "Mã Đối Soát", value: order.reconciliationCode },
        { label: "Ngày Đối Soát", value: fmtDate(order.reconciliationDate) },
        { label: "Ngày Xác Nhận TT", value: fmtDate(order.paymentConfirmDate) },
      ],
    },
    {
      title: "Đối Tác Vận Chuyển",
      icon: Truck,
      fields: [
        { label: "Đối Tác", value: order.carrierName },
        { label: "Tài Khoản", value: order.carrierAccount },
        { label: "Mã Vận Đơn", value: order.carrierOrderCode, mono: true },
        { label: "Nhóm Vùng", value: order.regionGroup },
        { label: "KL Khách (g)", value: order.customerWeight?.toString() },
        { label: "KL Đối Tác (g)", value: order.carrierWeight?.toString() },
        { label: "Shipper Lấy", value: order.pickupShipper },
        { label: "Shipper Giao", value: order.deliveryShipper },
      ],
    },
    {
      title: "Người Tạo Đơn",
      icon: User,
      fields: [
        { label: "Shop", value: order.creatorShopName },
        { label: "SĐT", value: order.creatorPhone },
        { label: "Nhân Viên", value: order.creatorStaff },
        { label: "Địa Chỉ", value: order.creatorAddress },
        { label: "Phường/Xã", value: order.creatorWard },
        { label: "Quận/Huyện", value: order.creatorDistrict },
        { label: "Tỉnh/TP", value: order.creatorProvince },
      ],
    },
    {
      title: "Người Gửi",
      icon: User,
      fields: [
        { label: "Shop", value: order.senderShopName },
        { label: "SĐT", value: order.senderPhone },
        { label: "Địa Chỉ", value: order.senderAddress },
        { label: "Phường/Xã", value: order.senderWard },
        { label: "Quận/Huyện", value: order.senderDistrict },
        { label: "Tỉnh/TP", value: order.senderProvince },
      ],
    },
    {
      title: "Người Nhận",
      icon: MapPin,
      fields: [
        { label: "Tên", value: order.receiverName },
        { label: "SĐT", value: order.receiverPhone },
        { label: "Địa Chỉ", value: order.receiverAddress },
        { label: "Phường/Xã", value: order.receiverWard },
        { label: "Quận/Huyện", value: order.receiverDistrict },
        { label: "Tỉnh/TP", value: order.receiverProvince },
      ],
    },
  ] : [];
  const completeDialogCopy = getClaimCompleteDialogCopy(completeConfirm?.requestCode || "");
  const reopenDialogCopy = getClaimReopenDialogCopy(reopenConfirm?.requestCode || "");
  const deleteDialogCopy = getClaimDeleteDialogCopy(deleteConfirm?.requestCode || "");

  return createPortal(
    <>
      <div style={{ ...overlayStyle, zIndex: ORDER_DIALOG_Z_INDEX }} onClick={onClose} />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: ORDER_DIALOG_Z_INDEX + 1,
          background: "#FFFFFF",
          border: "1.5px solid #2563EB",
          borderRadius: "12px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          width: "min(900px, calc(100vw - 16px))",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          animation: "orderDetailPopIn 0.2s ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 12px",
            borderBottom: "1px solid #e5e7eb",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "6px", borderRadius: "8px", background: "#eff6ff" }}>
              <Package size={18} color="#2563EB" />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>Chi Tiết Đơn Hàng</div>
              <div style={{ fontSize: "12px", color: "#6b7280", fontFamily: "monospace", marginTop: "1px" }}>{requestCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }} className="resp-dialog-actions">
            <button
              onClick={() => setShowClaim(true)}
              style={actionBtnStyle("#fdba74", "#fff7ed", "#ea580c")}
              onMouseEnter={(event) => { event.currentTarget.style.background = "#ffedd5"; }}
              onMouseLeave={(event) => { event.currentTarget.style.background = "#fff7ed"; }}
              title="Chuyển vào Đơn có vấn đề"
            >
              <AlertTriangle size={13} /> <span className="resp-hide-mobile">Đơn có vấn đề</span>
            </button>
            <button
              onClick={() => setShowTodo(true)}
              style={actionBtnStyle("#93c5fd", "#eff6ff", "#2563EB")}
              onMouseEnter={(event) => { event.currentTarget.style.background = "#dbeafe"; }}
              onMouseLeave={(event) => { event.currentTarget.style.background = "#eff6ff"; }}
              title="Thêm vào Công Việc"
            >
              <CheckSquare size={13} /> <span className="resp-hide-mobile">Công Việc</span>
            </button>
            <button
              onClick={() => setShowTracking(true)}
              style={actionBtnStyle("#6ee7b7", "#ecfdf5", "#059669")}
              onMouseEnter={(event) => { event.currentTarget.style.background = "#d1fae5"; }}
              onMouseLeave={(event) => { event.currentTarget.style.background = "#ecfdf5"; }}
              title="Tra hành trình"
            >
              <Truck size={13} /> <span className="resp-hide-mobile">Hành trình</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "8px",
                color: "#666",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }} className="resp-pad-mobile">
          {loading && (
            <div style={{ textAlign: "center", padding: "60px", color: "#6b7280" }}>
              <Loader2 className="animate-spin inline" size={24} />
              <div style={{ marginTop: "8px", fontSize: "13px" }}>Đang tải...</div>
            </div>
          )}
          {error && (
            <div style={{ textAlign: "center", padding: "40px", color: "#dc2626", fontSize: "14px" }}>
              {error}
            </div>
          )}
          {order && !loading && (
            <>
              <div style={{ marginBottom: "16px" }}>
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
                  {statusLabel}
                </span>
                <span style={{ fontSize: "12px", color: "#9ca3af", marginLeft: "10px" }}>
                  Ngày nhập: {fmtDateOnly(order.importedAt)}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }} className="resp-grid-1-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <div
                      key={section.title}
                      style={{
                        background: "#fff",
                        borderRadius: "10px",
                        border: "1px solid #e5e7eb",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 14px",
                          background: "#f8fafc",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <Icon style={{ width: "14px", height: "14px", color: "#64748b" }} />
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>{section.title}</span>
                      </div>
                      <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }} className="resp-grid-1-2">
                        {section.fields.map((field) => (
                          <div key={field.label}>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{field.label}</div>
                            <div
                              style={{
                                fontSize: "12px",
                                marginTop: "1px",
                                fontWeight: field.highlight ? 700 : 500,
                                color: field.green ? "#059669" : field.highlight ? "#1e293b" : "#475569",
                                fontFamily: field.mono ? "monospace" : "inherit",
                              }}
                            >
                              {renderFieldValue(field.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: "14px",
                  background: "#fff",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 14px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  <FileText style={{ width: "14px", height: "14px", color: "#64748b" }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Ghi Chú</span>
                </div>
                <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }} className="resp-grid-1-2">
                  <NoteBlock label="Ghi Chú Giao Hàng" value={order.deliveryNotes} bg="#f8fafc" />
                  <NoteBlock label="Mô Tả Sản Phẩm" value={order.productDescription} bg="#f8fafc" />
                  <NoteBlock label="Ghi Chú Nội Bộ" value={order.internalNotes} bg="#fefce8" />
                  <NoteBlock label="Ghi Chú Công Khai" value={order.publicNotes} bg="#eff6ff" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showClaim && order && (
        <AddClaimFromPageDialog
          open={showClaim}
          onClose={() => setShowClaim(false)}
          onSuccess={fetchOrder}
          order={{
            id: order.id,
            requestCode: order.requestCode,
            carrierName: order.carrierName,
            shopName: order.shopName,
            codAmount: order.codAmount,
          }}
          source="FROM_ORDER_DETAIL"
          baseZIndex={ORDER_DIALOG_Z_INDEX + 10}
        />
      )}

      {showTodo && order && (
        <AddTodoDialog
          open={showTodo}
          onClose={() => setShowTodo(false)}
          defaultTitle={`Xử lý đơn ${order.requestCode}`}
          defaultDescription={`Đơn hàng: ${order.requestCode} - ${order.shopName || "Không rõ shop"} - ${order.receiverName || "Không rõ KH"}`}
          defaultPriority="MEDIUM"
          linkedOrderId={order.id}
          source="FROM_ORDER_DETAIL"
          userRole={userRole}
        />
      )}

      <ClaimDetailDrawer
        claimId={activeClaimId || ""}
        open={Boolean(activeClaimId)}
        onClose={() => setActiveClaimId(null)}
        onUpdate={fetchOrder}
        onAddTodo={setClaimTodo}
        onCompleteToggle={handleClaimCompleteToggle}
        onDelete={(id, claimRequestCode) => setDeleteConfirm({ id, requestCode: claimRequestCode, loading: false })}
        onTrackOrder={setClaimTrackingCode}
        baseZIndex={CLAIM_DRAWER_Z_INDEX}
        refreshToken={claimRefreshToken}
        closeOnNestedOverlayOpen
      />

      {claimTodo && (
        <AddTodoDialog
          open={Boolean(claimTodo)}
          onClose={() => setClaimTodo(null)}
          defaultTitle={`Xử lý đơn ${claimTodo.order?.requestCode || ""}`}
          defaultDescription={getClaimTodoDescription(claimTodo)}
          defaultPriority="MEDIUM"
          linkedOrderId={claimTodo.order?.id}
          source="FROM_ORDERS"
          userRole={userRole}
        />
      )}

      <TrackingPopup
        requestCode={requestCode}
        isOpen={showTracking}
        onClose={() => setShowTracking(false)}
      />

      <TrackingPopup
        requestCode={claimTrackingCode || ""}
        isOpen={Boolean(claimTrackingCode)}
        onClose={() => setClaimTrackingCode(null)}
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

      <style>{`
        @keyframes orderDetailPopIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.95) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }
        @media (max-width: 640px) {
          .resp-grid-1-2 { grid-template-columns: 1fr !important; }
          .resp-hide-mobile { display: none !important; }
          .resp-pad-mobile { padding: 12px !important; }
          .resp-gap-mobile { gap: 6px !important; }
        }
      `}</style>
    </>,
    document.body
  );
}

function NoteBlock({ label, value, bg }: { label: string; value: string | null; bg: string }) {
  return (
    <div>
      <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>{label}</div>
      <div
        style={{
          fontSize: "12px",
          color: "#475569",
          whiteSpace: "pre-wrap",
          background: bg,
          padding: "8px 10px",
          borderRadius: "6px",
          minHeight: "32px",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}
