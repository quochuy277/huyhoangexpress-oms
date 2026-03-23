"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Loader2, Package, CreditCard, Truck, User, MapPin, FileText,
  AlertTriangle, CheckSquare,
} from "lucide-react";
import { AddTodoDialog } from "@/components/shared/AddTodoDialog";
import { AddClaimFromPageDialog } from "@/components/shared/AddClaimFromPageDialog";
import { TrackingPopup } from "@/components/tracking/TrackingPopup";

/* ── helpers ── */
function fmtVND(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("vi-VN") + "đ";
}
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDateOnly(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
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

/* ── styles ── */
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(2px)",
};

const actionBtnStyle = (border: string, bg: string, bgHover: string, color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px",
  borderRadius: "8px", border: `1.5px solid ${border}`, background: bg,
  color, fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
});

/* ── types ── */
interface Props {
  requestCode: string | null;
  open: boolean;
  onClose: () => void;
  userRole: string;
}

export function OrderDetailDialog({ requestCode, open, onClose, userRole }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sub-dialog states
  const [showClaim, setShowClaim] = useState(false);
  const [showTodo, setShowTodo] = useState(false);
  const [showTracking, setShowTracking] = useState(false);

  const isStaffOrViewer = userRole === "STAFF" || userRole === "VIEWER";

  const fetchOrder = useCallback(async () => {
    if (!requestCode) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${requestCode}/detail`);
      if (!res.ok) throw new Error("Không tìm thấy đơn hàng");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "Lỗi tải dữ liệu");
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

  if (!open || !requestCode) return null;

  const order = data;
  const statusColor = order ? (STATUS_COLORS[order.deliveryStatus] || "bg-gray-100 text-gray-700") : "";
  const statusLabel = order ? (STATUS_LABELS[order.deliveryStatus] || order.deliveryStatus) : "";

  type Field = { label: string; value: string | null | undefined; highlight?: boolean; green?: boolean; mono?: boolean };
  type Section = { title: string; icon: any; fields: Field[] };

  const sections: Section[] = order ? [
    {
      title: "Thông Tin Đơn Hàng",
      icon: Package,
      fields: [
        { label: "Mã Yêu Cầu", value: order.requestCode, mono: true },
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
          { label: "Doanh Thu", value: ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"].includes(order.deliveryStatus) ? fmtVND(order.revenue) : "—", highlight: true, green: true },
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

  return createPortal(
    <>
      <div style={overlayStyle} onClick={onClose} />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 9999, background: "#FFFFFF", border: "1.5px solid #2563EB",
          borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          width: "min(900px, calc(100vw - 32px))", maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          animation: "orderDetailPopIn 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", borderBottom: "1px solid #e5e7eb", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "6px", borderRadius: "8px", background: "#eff6ff" }}>
              <Package size={18} color="#2563EB" />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>Chi Tiết Đơn Hàng</div>
              <div style={{ fontSize: "12px", color: "#6b7280", fontFamily: "monospace", marginTop: "1px" }}>{requestCode}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {/* Action: Đơn có vấn đề */}
            <button
              onClick={() => setShowClaim(true)}
              style={actionBtnStyle("#fdba74", "#fff7ed", "#ffedd5", "#ea580c")}
              onMouseEnter={e => { e.currentTarget.style.background = "#ffedd5"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#fff7ed"; }}
              title="Chuyển vào Đơn có vấn đề"
            >
              <AlertTriangle size={13} /> Đơn có vấn đề
            </button>
            {/* Action: Công việc */}
            <button
              onClick={() => setShowTodo(true)}
              style={actionBtnStyle("#93c5fd", "#eff6ff", "#dbeafe", "#2563EB")}
              onMouseEnter={e => { e.currentTarget.style.background = "#dbeafe"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#eff6ff"; }}
              title="Thêm vào Công Việc"
            >
              <CheckSquare size={13} /> Công Việc
            </button>
            {/* Action: Hành trình */}
            <button
              onClick={() => setShowTracking(true)}
              style={actionBtnStyle("#6ee7b7", "#ecfdf5", "#d1fae5", "#059669")}
              onMouseEnter={e => { e.currentTarget.style.background = "#d1fae5"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#ecfdf5"; }}
              title="Tra hành trình"
            >
              <Truck size={13} /> Hành trình
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "6px",
                borderRadius: "8px", color: "#666", display: "flex", alignItems: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
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
              {/* Status badge */}
              <div style={{ marginBottom: "16px" }}>
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                  {statusLabel}
                </span>
                <span style={{ fontSize: "12px", color: "#9ca3af", marginLeft: "10px" }}>
                  Ngày nhập: {fmtDateOnly(order.importedAt)}
                </span>
              </div>

              {/* Sections grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <div key={section.title} style={{
                      background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px",
                        background: "#f8fafc", borderBottom: "1px solid #e5e7eb",
                      }}>
                        <Icon style={{ width: "14px", height: "14px", color: "#64748b" }} />
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>{section.title}</span>
                      </div>
                      <div style={{ padding: "10px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
                        {section.fields.map((f) => (
                          <div key={f.label}>
                            <div style={{ fontSize: "10px", color: "#94a3b8" }}>{f.label}</div>
                            <div style={{
                              fontSize: "12px", marginTop: "1px",
                              fontWeight: f.highlight ? 700 : 500,
                              color: f.green ? "#059669" : f.highlight ? "#1e293b" : "#475569",
                              fontFamily: f.mono ? "monospace" : "inherit",
                            }}>
                              {f.value || "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notes section */}
              <div style={{
                marginTop: "14px", background: "#fff", borderRadius: "10px",
                border: "1px solid #e5e7eb", overflow: "hidden",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px",
                  background: "#f8fafc", borderBottom: "1px solid #e5e7eb",
                }}>
                  <FileText style={{ width: "14px", height: "14px", color: "#64748b" }} />
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>Ghi Chú</span>
                </div>
                <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
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

      {/* Sub-dialogs */}
      {showClaim && order && (
        <AddClaimFromPageDialog
          open={showClaim}
          onClose={() => setShowClaim(false)}
          order={{
            id: order.id,
            requestCode: order.requestCode,
            carrierName: order.carrierName,
            shopName: order.shopName,
            codAmount: order.codAmount,
          }}
          source="FROM_ORDER_DETAIL"
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
        />
      )}

      <TrackingPopup
        requestCode={requestCode}
        isOpen={showTracking}
        onClose={() => setShowTracking(false)}
      />

      <style>{`@keyframes orderDetailPopIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.95) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }`}</style>
    </>,
    document.body
  );
}

function NoteBlock({ label, value, bg }: { label: string; value: string | null; bg: string }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "4px" }}>{label}</div>
      <div style={{
        fontSize: "12px", color: "#475569", whiteSpace: "pre-wrap",
        background: bg, padding: "8px 10px", borderRadius: "6px", minHeight: "32px",
      }}>
        {value || "—"}
      </div>
    </div>
  );
}
