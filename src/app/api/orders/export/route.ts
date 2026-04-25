import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { DeliveryStatus, Prisma } from "@prisma/client";
import { mapStatusToVietnamese } from "@/lib/status-mapper";
import { exportLimiter } from "@/lib/rate-limiter";
import { requirePermission } from "@/lib/route-permissions";
import { buildOrdersListQuery } from "@/lib/orders-list";
import { createServerTiming } from "@/lib/server-timing";
import { logger } from "@/lib/logger";
import { encodeCsvHeader, encodeCsvRows } from "@/lib/csv-stream";

// Streamed CSV export for orders.
//
// Previous version built the full XLSX workbook in memory with `xlsx.write(...)`
// before replying — OOM risk at 10K+ rows on 512 MB hosts, and routinely broke
// the 30s serverless timeout. Sprint 2 (2026-04) switches to CSV so we can
// stream batches directly to the client; peak server memory is now one batch
// (~500 rows) instead of the full result set.
//
// XLSX is still the nicer download, but CSV with a BOM opens fine in Excel
// 2013+ and preserves Vietnamese diacritics. If a user wants a formatted
// workbook, they can open the CSV and Save As.

type ExportType = "internal" | "customer";

// Upper bound — same as before, to keep behaviour the same when we page through
// all data. Cursor-based pagination would let us go higher, but 10K is enough
// for every real export we've seen.
const MAX_EXPORT_ROWS = 10_000;
const EXPORT_BATCH_SIZE = 500;

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

// --- Internal export: full order record, every column we have ---

const INTERNAL_HEADERS = [
  "STT", "Mã Đối Soát", "Ngày Đối Soát", "Tên Cửa Hàng", "Mã Đơn Khách Hàng",
  "Mã Yêu Cầu", "Trạng Thái", "Thời Gian Tạo", "Thời Gian Lấy Hàng",
  "Thu Hộ", "Thu Hộ Ban Đầu", "Trị Giá", "Phí Vận Chuyển", "Phụ Phí",
  "Phí Vượt Khối Lượng", "Phí Bảo Hiểm", "Phí Thu Hộ Tiền Hàng", "Phí Hoàn Hàng",
  "Tổng Phí", "Phí Đối Tác Thu", "Phí Bảo Hiểm GHSV", "Doanh Thu",
  "Tên Cửa Hàng Tạo", "SĐT Người Tạo", "Nhân Viên Tạo",
  "Địa Chỉ Người Tạo", "Phường / Xã Tạo", "Quận / Huyện Tạo", "Tỉnh / Thành Phố Tạo",
  "Tên Cửa Hàng Gửi Hàng", "SĐT Người Gửi Hàng", "Địa Chỉ Người Gửi Hàng",
  "Phường / Xã Gửi Hàng", "Quận / Huyện Gửi Hàng", "Tỉnh / Thành Phố Gửi Hàng",
  "Người Nhận", "Số Điện Thoại", "Địa Chỉ",
  "Phường / Xã", "Quận / Huyện", "Tỉnh / Thành Phố",
  "Ghi Chú Giao Hàng", "Sản Phẩm", "Ngày Xác Nhận Thu Tiền",
  "Ghi Chú Nội Bộ", "Ghi Chú Công Khai", "Cập Nhật Lần Cuối",
  "Đơn Vị Vận Chuyển", "Tài Khoản Đối Tác", "Mã Đơn Đối Tác", "Nhóm Vùng Miền",
  "Khối Lượng Khách Hàng", "Khối Lượng NVC", "Ngày Giao Thành Công",
  "Shipper Lấy Hàng (NB)", "Shipper Giao (NB)", "Nguồn Lên Đơn",
  "Đơn Hàng Một Phần", "Mã Đơn Hàng Một Phần", "NV Kinh Doanh",
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildInternalRow(o: any, index: number): unknown[] {
  const totalFee = dec(o.totalFee);
  const carrierFee = dec(o.carrierFee);
  const showRevenue = ["RECONCILED", "RETURNED_FULL", "RETURNED_PARTIAL"].includes(o.deliveryStatus);

  return [
    index + 1,
    o.reconciliationCode || "",
    formatDateVN(o.reconciliationDate),
    o.shopName || "",
    o.customerOrderCode || "",
    o.requestCode,
    o.status || "",
    formatDateTimeVN(o.createdTime),
    formatDateTimeVN(o.pickupTime),
    dec(o.codAmount),
    dec(o.codOriginal),
    dec(o.declaredValue),
    dec(o.shippingFee),
    dec(o.surcharge),
    dec(o.overweightFee),
    dec(o.insuranceFee),
    dec(o.codServiceFee),
    dec(o.returnFee),
    totalFee,
    carrierFee,
    dec(o.ghsvInsuranceFee),
    showRevenue ? totalFee - carrierFee : 0,
    o.creatorShopName || "",
    o.creatorPhone || "",
    o.creatorStaff || "",
    o.creatorAddress || "",
    o.creatorWard || "",
    o.creatorDistrict || "",
    o.creatorProvince || "",
    o.senderShopName || "",
    o.senderPhone || "",
    o.senderAddress || "",
    o.senderWard || "",
    o.senderDistrict || "",
    o.senderProvince || "",
    o.receiverName || "",
    o.receiverPhone || "",
    o.receiverAddress || "",
    o.receiverWard || "",
    o.receiverDistrict || "",
    o.receiverProvince || "",
    o.deliveryNotes || "",
    o.productDescription || "",
    formatDateVN(o.paymentConfirmDate),
    o.internalNotes || "",
    o.publicNotes || "",
    formatDateTimeVN(o.lastUpdated),
    o.carrierName || "",
    o.carrierAccount || "",
    o.carrierOrderCode || "",
    o.regionGroup || "",
    o.customerWeight ?? "",
    o.carrierWeight ?? "",
    formatDateVN(o.deliveredDate),
    o.pickupShipper || "",
    o.deliveryShipper || "",
    o.orderSource || "",
    o.partialOrderType || "",
    o.partialOrderCode || "",
    o.salesStaff || "",
  ];
}

// --- Customer export: trimmed fields suitable for sharing with clients ---

const CUSTOMER_HEADERS = [
  "Mã Yêu Cầu", "Mã Đơn Đối Tác", "Tên Cửa Hàng", "Người Nhận",
  "Số Điện Thoại", "Tỉnh / Thành Phố", "Trạng Thái", "Thời Gian Tạo",
  "Thu Hộ (đ)", "Tổng Phí (đ)", "Khối Lượng (g)",
] as const;

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
} as const satisfies Prisma.OrderSelect;

type CustomerOrderRow = {
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
};

function buildCustomerRow(o: CustomerOrderRow): unknown[] {
  return [
    o.requestCode,
    o.carrierOrderCode || "",
    o.shopName || "",
    o.receiverName || "",
    o.receiverPhone || "",
    o.receiverProvince || "",
    mapStatusToVietnamese(o.deliveryStatus),
    formatDateTimeVN(o.createdTime),
    dec(o.codAmount),
    dec(o.totalFee),
    o.customerWeight ?? "",
  ];
}

export async function GET(req: NextRequest) {
  const timing = createServerTiming();

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

  const headers = exportType === "internal" ? INTERNAL_HEADERS : CUSTOMER_HEADERS;
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = exportType === "internal" ? "noi-bo" : "khach-hang";
  const filename = `${prefix}-${timestamp}.csv`;

  // Note: Server-Timing is frozen at response creation — stream-internal DB
  // round-trips are not included (headers can't be appended mid-stream).
  // We log total stream time server-side instead.
  const timingHeader = timing.headerValue();

  const exportStart = performance.now();
  const stream = new ReadableStream({
    async start(controller) {
      let skip = 0;
      let exportedCount = 0;
      let exportIndex = 1;

      controller.enqueue(encodeCsvHeader(headers));

      try {
        while (exportedCount < MAX_EXPORT_ROWS) {
          const remaining = MAX_EXPORT_ROWS - exportedCount;
          const take = Math.min(EXPORT_BATCH_SIZE, remaining);

          const batch = await prisma.order.findMany({
            where: query.where,
            ...(exportType === "customer" ? { select: CUSTOMER_SELECT } : {}),
            orderBy: { createdTime: "desc" },
            skip,
            take,
          });

          if (batch.length === 0) break;

          const rows =
            exportType === "internal"
              ? batch.map((o, i) => buildInternalRow(o, exportIndex + i - 1))
              : batch.map((o) => buildCustomerRow(o as CustomerOrderRow));

          controller.enqueue(encodeCsvRows(rows));

          exportedCount += batch.length;
          exportIndex += batch.length;
          skip += batch.length;

          // Short-circuit once Prisma returns a partial page — no more rows.
          if (batch.length < take) break;
        }

        logger.info(
          "GET /api/orders/export",
          `Exported ${exportedCount} ${exportType} rows in ${(performance.now() - exportStart).toFixed(1)}ms`,
        );
        controller.close();
      } catch (error) {
        logger.error("GET /api/orders/export", "Error streaming", error);
        controller.error(error);
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Server-Timing": timingHeader,
      "Cache-Control": "no-store",
    },
  });
}
