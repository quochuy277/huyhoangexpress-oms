import { getCachedSession } from "@/lib/cached-session";
import { prisma } from "@/lib/prisma";
import { formatVND, formatDate, formatDateOnly } from "@/lib/utils";
import { mapStatusToVietnamese, STATUS_COLORS } from "@/lib/status-mapper";
import { Package, MapPin, User, CreditCard, FileText, Truck } from "lucide-react";
import { BackButton } from "@/components/shared/BackButton";
import { TrackingTimelineSection } from "@/components/tracking/TrackingTimelineSection";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrderDetailPageGridClassNames } from "@/components/orders/ordersResponsive";

interface Props {
  params: Promise<{ requestCode: string }>;
  searchParams: Promise<{ from?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { requestCode } = await params;
  return { title: `Đơn hàng ${requestCode}` };
}

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { requestCode } = await params;
  const { from } = await searchParams;

  const session = await getCachedSession();
  const userRole = session?.user?.role || "VIEWER";
  const isStaffOrViewer = userRole === "STAFF" || userRole === "VIEWER";

  const order = await prisma.order.findUnique({
    where: { requestCode },
    include: {
      claimOrder: true,
      returnTracking: true,
    },
  });

  if (!order) return notFound();
  const responsiveClasses = getOrderDetailPageGridClassNames();

  const sections = [
    {
      title: "Thông Tin Đơn Hàng",
      icon: Package,
      fields: [
        { label: "Mã Yêu Cầu", value: order.requestCode, mono: true },
        { label: "Mã Đơn KH", value: order.customerOrderCode },
        { label: "Shop", value: order.shopName },
        { label: "Trạng Thái Gốc", value: order.status },
        { label: "Ngày Tạo", value: formatDate(order.createdTime) },
        { label: "Ngày Lấy Hàng", value: formatDate(order.pickupTime) },
        { label: "Ngày Giao Hàng", value: formatDate(order.deliveredDate) },
        { label: "Cập Nhật Cuối", value: formatDate(order.lastUpdated) },
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
        { label: "COD", value: formatVND(order.codAmount), highlight: true },
        { label: "COD Gốc", value: formatVND(order.codOriginal) },
        { label: "Giá Trị Khai Báo", value: formatVND(order.declaredValue) },
        { label: "Phí Ship", value: formatVND(order.shippingFee) },
        { label: "Phụ Phí", value: formatVND(order.surcharge) },
        { label: "Phí Quá Cân", value: formatVND(order.overweightFee) },
        { label: "Phí Bảo Hiểm", value: formatVND(order.insuranceFee) },
        { label: "Phí Dịch Vụ COD", value: formatVND(order.codServiceFee) },
        { label: "Phí Hoàn", value: formatVND(order.returnFee) },
        { label: "Tổng Phí", value: formatVND(order.totalFee), highlight: true },
        ...(isStaffOrViewer ? [] : [
          { label: "Phí Đối Tác Thu", value: formatVND(order.carrierFee) },
          { label: "Phí BH GHSV", value: formatVND(order.ghsvInsuranceFee) },
          { label: "Doanh Thu", value: ['RECONCILED', 'RETURNED_FULL', 'RETURNED_PARTIAL'].includes(order.deliveryStatus) ? formatVND((order as any).revenue) : "—", highlight: true, green: true },
        ]),
        { label: "Mã Đối Soát", value: order.reconciliationCode },
        { label: "Ngày Đối Soát", value: formatDate(order.reconciliationDate) },
        { label: "Ngày Xác Nhận TT", value: formatDate(order.paymentConfirmDate) },
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton from={from} />
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-800">
              {order.requestCode}
            </h1>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                STATUS_COLORS[order.deliveryStatus] || "bg-gray-100 text-gray-700"
              }`}
            >
              {mapStatusToVietnamese(order.deliveryStatus)}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Ngày nhập: {formatDateOnly(order.importedAt)}
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className={responsiveClasses.sectionsWrapper}>
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                <Icon className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-700">
                  {section.title}
                </h2>
              </div>
              <div className={responsiveClasses.fieldsWrapper}>
                {section.fields.map((field) => (
                  <div key={field.label}>
                    <p className="text-xs text-slate-400">{field.label}</p>
                    <p
                      className={`text-sm mt-0.5 ${
                        (field as any).highlight
                          ? (field as any).green
                            ? "font-bold text-emerald-600"
                            : "font-bold text-slate-800"
                          : "text-slate-700"
                      } ${(field as any).mono ? "font-mono" : ""}`}
                    >
                      {field.value || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tracking Timeline */}
      <TrackingTimelineSection requestCode={order.requestCode} />

      {/* Notes section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
          <FileText className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-700">Ghi Chú</h2>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Ghi Chú Giao Hàng</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg min-h-[40px]">
              {order.deliveryNotes || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Mô Tả Sản Phẩm</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg min-h-[40px]">
              {order.productDescription || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Ghi Chú Nội Bộ</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap bg-yellow-50 p-3 rounded-lg min-h-[40px]">
              {order.internalNotes || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Ghi Chú Công Khai</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap bg-blue-50 p-3 rounded-lg min-h-[40px]">
              {order.publicNotes || "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
