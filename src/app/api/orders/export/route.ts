import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import type { DeliveryStatus } from "@prisma/client";
import { mapStatusToVietnamese } from "@/lib/status-mapper";
import { exportLimiter } from "@/lib/rate-limiter";
import { requirePermission } from "@/lib/route-permissions";
import { buildOrdersListQuery } from "@/lib/orders-list";
import { createServerTiming } from "@/lib/server-timing";
import { logger } from "@/lib/logger";

type ExportType = "internal" | "customer";

const MAX_EXPORT_ROWS = 10_000;

function formatDateTimeVN(date: Date | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(date));
}

function formatDateVN(date: Date | null | undefined): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(date));
}

function dec(val: unknown): number {
  if (val === null || val === undefined) return 0;
  return Number(val) || 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildInternalRow(o: any, index: number) {
  const totalFee = dec(o.totalFee);
  const carrierFee = dec(o.carrierFee);
  const showRevenue = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"].includes(o.deliveryStatus);

  return {
    "STT": index + 1,
    "Mã Đối Soát": o.reconciliationCode || "",
    "Ngày Đối Soát": formatDateVN(o.reconciliationDate),
    "Tên Cửa Hàng": o.shopName || "",
    "Mã Đơn Khách Hàng": o.customerOrderCode || "",
    "Mã Yêu Cầu": o.requestCode,
    "Trạng Thái": o.status || "",
    "Thời Gian Tạo": formatDateTimeVN(o.createdTime),
    "Thời Gian Lấy Hàng": formatDateTimeVN(o.pickupTime),
    "Thu Hộ": dec(o.codAmount),
    "Thu Hộ Ban Đầu": dec(o.codOriginal),
    "Trị Giá": dec(o.declaredValue),
    "Phí Vận Chuyển": dec(o.shippingFee),
    "Phụ Phí": dec(o.surcharge),
    "Phí Vượt Khối Lượng": dec(o.overweightFee),
    "Phí Bảo Hiểm": dec(o.insuranceFee),
    "Phí Thu Hộ Tiền Hàng": dec(o.codServiceFee),
    "Phí Hoàn Hàng": dec(o.returnFee),
    "Tổng Phí": totalFee,
    "Phí Đối Tác Thu": carrierFee,
    "Phí Bảo Hiểm GHSV": dec(o.ghsvInsuranceFee),
    "Doanh Thu": showRevenue ? (totalFee - carrierFee) : 0,
    "Tên Cửa Hàng Tạo": o.creatorShopName || "",
    "SĐT Người Tạo": o.creatorPhone || "",
    "Nhân Viên Tạo": o.creatorStaff || "",
    "Địa Chỉ Người Tạo": o.creatorAddress || "",
    "Phường / Xã Tạo": o.creatorWard || "",
    "Quận / Huyện Tạo": o.creatorDistrict || "",
    "Tỉnh / Thành Phố Tạo": o.creatorProvince || "",
    "Tên Cửa Hàng Gửi Hàng": o.senderShopName || "",
    "SĐT Người Gửi Hàng": o.senderPhone || "",
    "Địa Chỉ Người Gửi Hàng": o.senderAddress || "",
    "Phường / Xã Gửi Hàng": o.senderWard || "",
    "Quận / Huyện Gửi Hàng": o.senderDistrict || "",
    "Tỉnh / Thành Phố Gửi Hàng": o.senderProvince || "",
    "Người Nhận": o.receiverName || "",
    "Số Điện Thoại": o.receiverPhone || "",
    "Địa Chỉ": o.receiverAddress || "",
    "Phường / Xã": o.receiverWard || "",
    "Quận / Huyện": o.receiverDistrict || "",
    "Tỉnh / Thành Phố": o.receiverProvince || "",
    "Ghi Chú Giao Hàng": o.deliveryNotes || "",
    "Sản Phẩm": o.productDescription || "",
    "Ngày Xác Nhận Thu Tiền": formatDateVN(o.paymentConfirmDate),
    "Ghi Chú Nội Bộ": o.internalNotes || "",
    "Ghi Chú Công Khai": o.publicNotes || "",
    "Cập Nhật Lần Cuối": formatDateTimeVN(o.lastUpdated),
    "Đơn Vị Vận Chuyển": o.carrierName || "",
    "Tài Khoản Đối Tác": o.carrierAccount || "",
    "Mã Đơn Đối Tác": o.carrierOrderCode || "",
    "Nhóm Vùng Miền": o.regionGroup || "",
    "Khối Lượng Khách Hàng": o.customerWeight ?? "",
    "Khối Lượng NVC": o.carrierWeight ?? "",
    "Ngày Giao Thành Công": formatDateVN(o.deliveredDate),
    "Shipper Lấy Hàng (NB)": o.pickupShipper || "",
    "Shipper Giao (NB)": o.deliveryShipper || "",
    "Nguồn Lên Đơn": o.orderSource || "",
    "Đơn Hàng Một Phần": o.partialOrderType || "",
    "Mã Đơn Hàng Một Phần": o.partialOrderCode || "",
    "NV Kinh Doanh": o.salesStaff || "",
  };
}

function buildCustomerRow(o: {
  requestCode: string;
  carrierOrderCode: string | null;
  shopName: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  receiverProvince: string | null;
  deliveryStatus: DeliveryStatus;
  createdTime: Date | null;
  codAmount: unknown;
  totalFee: unknown;
  customerWeight: number | null;
}) {
  return {
    "Mã Yêu Cầu": o.requestCode,
    "Mã Đơn Đối Tác": o.carrierOrderCode || "",
    "Tên Cửa Hàng": o.shopName || "",
    "Người Nhận": o.receiverName || "",
    "Số Điện Thoại": o.receiverPhone || "",
    "Tỉnh / Thành Phố": o.receiverProvince || "",
    "Trạng Thái": mapStatusToVietnamese(o.deliveryStatus),
    "Thời Gian Tạo": formatDateTimeVN(o.createdTime),
    "Thu Hộ (đ)": dec(o.codAmount),
    "Tổng Phí (đ)": dec(o.totalFee),
    "Khối Lượng (g)": o.customerWeight ?? "",
  };
}

const CUSTOMER_SELECT = {
  requestCode: true,
  carrierOrderCode: true,
  shopName: true,
  receiverName: true,
  receiverPhone: true,
  receiverProvince: true,
  deliveryStatus: true,
  createdTime: true,
  codAmount: true,
  totalFee: true,
  customerWeight: true,
} as const;

export async function GET(req: NextRequest) {
  const timing = createServerTiming();

  try {
    const session = await timing.measure("auth", () => auth());
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401, headers: timing.headers() });
    }
    const { searchParams } = new URL(req.url);
    const exportType: ExportType = searchParams.get("type") === "customer" ? "customer" : "internal";
    const permKey = exportType === "customer" ? "canExportOrdersCustomer" : "canExportOrdersInternal";
    const denied = requirePermission(session.user, permKey, "Bạn không có quyền xuất file");
    if (denied) return denied;

    const rateLimited = exportLimiter.check(session.user.id!);
    if (rateLimited) return rateLimited;

    const query = await timing.measure("query-build", () =>
      buildOrdersListQuery({
        page: 1,
        pageSize: MAX_EXPORT_ROWS,
        search: searchParams.get("search") || undefined,
        status: searchParams.get("status") || undefined,
        fromDate: searchParams.get("fromDate") || undefined,
        toDate: searchParams.get("toDate") || undefined,
        dateField: searchParams.get("dateField") || undefined,
        hasNotes: searchParams.get("hasNotes") || undefined,
        shopName: searchParams.get("shopName") || undefined,
        salesStaff: searchParams.get("salesStaff") || undefined,
        partialOrderType: searchParams.get("partialOrderType") || undefined,
        regionGroup: searchParams.get("regionGroup") || undefined,
        valueField: searchParams.get("valueField") || undefined,
        valueCondition: searchParams.get("valueCondition") || undefined,
        valueAmount: searchParams.get("valueAmount") ? Number(searchParams.get("valueAmount")) : undefined,
        sortBy: "createdTime",
        sortOrder: "desc",
      }),
    );

    const orders = await timing.measure("db", () =>
      prisma.order.findMany({
        where: query.where,
        ...(exportType === "customer" ? { select: CUSTOMER_SELECT } : {}),
        orderBy: { createdTime: "desc" },
        take: MAX_EXPORT_ROWS,
      }),
    );

    const rows = await timing.measure("transform", () =>
      exportType === "internal"
        ? orders.map((o, i) => buildInternalRow(o, i))
        : orders.map((o) => buildCustomerRow(o as Parameters<typeof buildCustomerRow>[0])),
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Không có đơn hàng nào để xuất" },
        { status: 404, headers: timing.headers() },
      );
    }

    const buf = await timing.measure("workbook", () => {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = Object.keys(rows[0]).map((key) => ({
        wch: Math.max(key.length + 2, 14),
      }));

      const workbook = XLSX.utils.book_new();
      const sheetName = exportType === "internal" ? "Đơn Hàng (Nội Bộ)" : "Đơn Hàng";
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    });

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const prefix = exportType === "internal" ? "noi-bo" : "khach-hang";
    const timingHeader = timing.headerValue();

    logger.info("GET /api/orders/export", `Exported ${rows.length} ${exportType} rows`, {
      timing: timingHeader,
    });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${prefix}-${timestamp}.xlsx"`,
        "Server-Timing": timingHeader,
      },
    });
  } catch (error) {
    logger.error("GET /api/orders/export", "Export error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500, headers: timing.headers() });
  }
}
