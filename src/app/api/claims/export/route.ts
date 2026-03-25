import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";

const ISSUE_TYPE_LABELS: Record<string, string> = {
  SLOW_JOURNEY: "Hành trình chậm",
  SUSPICIOUS: "Nghi ngờ",
  LOST: "Thất lạc",
  DAMAGED: "Hư hỏng",
  OTHER: "Vấn đề khác",
};

const CLAIM_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chưa xử lý",
  VERIFYING_CARRIER: "Đang xác minh",
  CLAIM_SUBMITTED: "Đã gửi KN",
  COMPENSATION_REQUESTED: "Đã yêu cầu ĐB",
  RESOLVED: "Đã xử lý",
  CARRIER_COMPENSATED: "NVC đã đền bù",
  CARRIER_REJECTED: "NVC từ chối",
  CUSTOMER_COMPENSATED: "Đã đền bù KH",
  CUSTOMER_REJECTED: "Từ chối ĐB KH",
};

const SOURCE_LABELS: Record<string, string> = {
  AUTO_SLOW_JOURNEY: "Tự động (hành trình chậm)",
  AUTO_INTERNAL_NOTE: "Tự động (ghi chú)",
  FROM_DELAYED: "Từ đơn hoãn",
  FROM_RETURNS: "Từ đơn hoàn",
  FROM_ORDERS: "Từ đơn hàng",
  MANUAL: "Thủ công",
};

function formatDateVN(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

function formatDateTimeVN(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) +
    " " +
    d.toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const url = req.nextUrl.searchParams;
    const search = url.get("search") || "";
    const issueType = url.get("issueType") || "";
    const claimStatus = url.get("claimStatus") || "";
    const showCompleted = url.get("showCompleted") === "true";

    // Build where clause (same logic as GET /api/claims)
    const where: Prisma.ClaimOrderWhereInput = {};

    if (!showCompleted) {
      where.isCompleted = false;
    } else {
      where.isCompleted = true;
    }

    if (issueType) {
      const types = issueType.split(",");
      where.issueType = { in: types as any[] };
    }

    if (claimStatus) {
      where.claimStatus = claimStatus as any;
    }

    const orderWhere: Prisma.OrderWhereInput = {};
    if (search) {
      orderWhere.OR = [
        { requestCode: { contains: search, mode: "insensitive" } },
        { carrierOrderCode: { contains: search, mode: "insensitive" } },
        { receiverPhone: { contains: search, mode: "insensitive" } },
        { shopName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (Object.keys(orderWhere).length > 0) {
      where.order = orderWhere;
    }

    // Fetch all claims matching filters (max 10000)
    const claims = await prisma.claimOrder.findMany({
      where,
      include: {
        order: {
          select: {
            requestCode: true,
            carrierOrderCode: true,
            carrierName: true,
            shopName: true,
            status: true,
            deliveryStatus: true,
            codAmount: true,
            totalFee: true,
            staffNotes: true,
            receiverPhone: true,
            receiverName: true,
            receiverAddress: true,
            pickupTime: true,
            regionGroup: true,
          },
        },
        createdBy: { select: { name: true } },
      },
      orderBy: { deadline: "asc" },
      take: 10000,
    });

    // Build Excel rows
    const rows = claims.map((c, idx) => {
      const daysPending = Math.floor(
        (Date.now() - new Date(c.detectedDate).getTime()) / 86400000
      );

      return {
        "STT": idx + 1,
        "Mã Yêu Cầu": c.order?.requestCode || "",
        "Mã ĐT Đối Tác": c.order?.carrierOrderCode || "",
        "Cửa Hàng": c.order?.shopName || "",
        "Đối Tác Vận Chuyển": c.order?.carrierName || "",
        "Trạng Thái Đơn": c.order?.status || "",
        "COD (đ)": Number(c.order?.codAmount || 0),
        "Tổng Phí (đ)": Number(c.order?.totalFee || 0),
        "Nhóm Vùng Miền": c.order?.regionGroup || "",
        "Thời Gian Lấy Hàng": formatDateTimeVN(c.order?.pickupTime || null),
        "Loại Vấn Đề": ISSUE_TYPE_LABELS[c.issueType] || c.issueType,
        "Nội Dung Vấn Đề": c.issueDescription || "",
        "Ngày Phát Hiện": formatDateVN(c.detectedDate),
        "Ngày Tồn Đọng": `${daysPending} ngày`,
        "TT Xử Lý": CLAIM_STATUS_LABELS[c.claimStatus] || c.claimStatus,
        "Nội Dung Xử Lý": c.processingContent || "",
        "Thời Hạn": formatDateVN(c.deadline),
        "Số Tiền NVC Đền Bù (đ)": Number(c.carrierCompensation || 0),
        "Số Tiền Đền Bù KH (đ)": Number(c.customerCompensation || 0),
        "Hoàn Tất": c.isCompleted ? "Đã hoàn tất" : "Chưa",
        "Nguồn": SOURCE_LABELS[c.source] || c.source,
        "Người Tạo": c.createdBy?.name || "",
        "Ngày Tạo": formatDateVN(c.createdAt),
        "Người Nhận": c.order?.receiverName || "",
        "SĐT Người Nhận": c.order?.receiverPhone || "",
        "Ghi Chú NB": c.order?.staffNotes || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
    const headers = Object.keys(rows[0] || {});
    worksheet["!cols"] = headers.map((key) => ({
      wch: Math.max(key.length + 2, 14),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Đơn Có Vấn Đề");

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const timestamp = new Date()
      .toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
      .replace(/\//g, "");

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="don-co-van-de-${timestamp}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("GET /api/claims/export error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
