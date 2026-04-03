import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import type { Prisma, DeliveryStatus } from "@prisma/client";
import { mapStatusToVietnamese } from "@/lib/status-mapper";
import { exportLimiter } from "@/lib/rate-limiter";
import { requirePermission } from "@/lib/route-permissions";

export async function GET(req: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const denied = requirePermission(session.user, "canExportOrders", "Bạn không có quyền xuất file");
  if (denied) return denied;

  // Rate limit
  const rateLimited = exportLimiter.check(session.user.id!);
  if (rateLimited) return rateLimited;

  const { searchParams } = new URL(req.url);

  // Use same filter logic as orders API
  const search = searchParams.get("search")?.trim();
  const statusFilter = searchParams.get("status");
  const carrier = searchParams.get("carrier");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  const where: Prisma.OrderWhereInput = {};
  const AND: Prisma.OrderWhereInput[] = [];

  if (search) {
    AND.push({
      OR: [
        { requestCode: { contains: search, mode: "insensitive" } },
        { receiverName: { contains: search, mode: "insensitive" } },
        { receiverPhone: { contains: search } },
        { shopName: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (statusFilter) {
    const statuses = statusFilter.split(",").filter(Boolean) as DeliveryStatus[];
    if (statuses.length > 0) {
      AND.push({ deliveryStatus: { in: statuses } });
    }
  }

  if (carrier) AND.push({ carrierName: carrier });
  if (fromDate) AND.push({ createdTime: { gte: new Date(fromDate) } });
  if (toDate) {
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    AND.push({ createdTime: { lte: endDate } });
  }

  if (AND.length > 0) where.AND = AND;

  // Fetch orders (max 10000 for export)
  const orders = await prisma.order.findMany({
    where,
    select: {
      requestCode: true,
      customerOrderCode: true,
      shopName: true,
      receiverName: true,
      receiverPhone: true,
      receiverProvince: true,
      receiverDistrict: true,
      status: true,
      deliveryStatus: true,
      codAmount: true,
      shippingFee: true,
      totalFee: true,
      carrierFee: true,
      revenue: true,
      carrierName: true,
      carrierOrderCode: true,
      regionGroup: true,
      createdTime: true,
      lastUpdated: true,
      salesStaff: true,
    },
    orderBy: { createdTime: "desc" },
    take: 10000,
  });

  // Build Excel
  const rows = orders.map((o) => ({
    "Mã Yêu Cầu": o.requestCode,
    "Mã Đơn KH": o.customerOrderCode || "",
    "Shop": o.shopName || "",
    "Người Nhận": o.receiverName || "",
    "SĐT": o.receiverPhone || "",
    "Tỉnh/TP": o.receiverProvince || "",
    "Quận/Huyện": o.receiverDistrict || "",
    "Trạng Thái": mapStatusToVietnamese(o.deliveryStatus),
    "COD (đ)": o.codAmount,
    "Phí Ship (đ)": o.shippingFee,
    "Tổng Phí (đ)": o.totalFee,
    "Phí Đối Tác (đ)": o.carrierFee,
    "Doanh Thu (đ)": ['RECONCILED', 'RETURNED_FULL', 'RETURNED_PARTIAL'].includes(o.deliveryStatus) ? (o as any).revenue : "—",
    "Đối Tác": o.carrierName || "",
    "Mã Đối Tác": o.carrierOrderCode || "",
    "Nhóm Vùng": o.regionGroup || "",
    "Ngày Tạo": o.createdTime
      ? new Date(o.createdTime).toLocaleDateString("vi-VN")
      : "",
    "Cập Nhật Cuối": o.lastUpdated
      ? new Date(o.lastUpdated).toLocaleDateString("vi-VN")
      : "",
    "NV Kinh Doanh": o.salesStaff || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, 12),
  }));
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Đơn Hàng");

  const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="don-hang-${timestamp}.xlsx"`,
    },
  });
}
