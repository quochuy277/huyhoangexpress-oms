import type { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { NextRequest, NextResponse } from "next/server";

import { CLAIM_STATUS_CONFIG, ISSUE_TYPE_CONFIG } from "@/lib/claims-config";
import { auth } from "@/lib/auth";
import { requireClaimsPermission } from "@/lib/claims-permissions";
import { prisma } from "@/lib/prisma";

const SOURCE_LABELS: Record<string, string> = {
  AUTO_SLOW_JOURNEY: "Tự động (hành trình chậm)",
  AUTO_INTERNAL_NOTE: "Tự động (ghi chú)",
  FROM_DELAYED: "Từ đơn hoãn",
  FROM_RETURNS: "Từ đơn hoàn",
  FROM_ORDERS: "Từ đơn hàng",
  MANUAL: "Thủ công",
};

const EXPORT_LIMIT = 3000;

function formatDateVN(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

function formatDateTimeVN(date: Date | string | null): string {
  if (!date) return "";
  const value = new Date(date);
  return `${value.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} ${value.toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const denied = requireClaimsPermission(session.user, "canViewClaims");
    if (denied) {
      return denied;
    }

    const params = req.nextUrl.searchParams;
    const search = params.get("search") || "";
    const issueType = params.get("issueType") || "";
    const claimStatus = params.get("claimStatus") || "";
    const shopName = params.get("shopName") || "";
    const orderStatus = params.get("orderStatus") || "";
    const showCompleted = params.get("showCompleted") === "true";

    const where: Prisma.ClaimOrderWhereInput = {
      isCompleted: showCompleted,
    };

    if (issueType) {
      where.issueType = { in: issueType.split(",") as any[] };
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
    if (shopName) {
      orderWhere.shopName = shopName;
    }
    if (orderStatus) {
      orderWhere.status = orderStatus;
    }
    if (Object.keys(orderWhere).length > 0) {
      where.order = orderWhere;
    }

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
      take: EXPORT_LIMIT,
    });

    const rows = claims.map((claim, index) => {
      const daysPending = Math.floor((Date.now() - new Date(claim.detectedDate).getTime()) / 86400000);

      return {
        STT: index + 1,
        "Mã Yêu Cầu": claim.order?.requestCode || "",
        "Mã ĐT Đối Tác": claim.order?.carrierOrderCode || "",
        "Cửa Hàng": claim.order?.shopName || "",
        "Đối Tác Vận Chuyển": claim.order?.carrierName || "",
        "Trạng Thái Đơn": claim.order?.status || "",
        "COD (đ)": Number(claim.order?.codAmount || 0),
        "Tổng Phí (đ)": Number(claim.order?.totalFee || 0),
        "Nhóm Vùng Miền": claim.order?.regionGroup || "",
        "Thời Gian Lấy Hàng": formatDateTimeVN(claim.order?.pickupTime || null),
        "Loại Vấn Đề": ISSUE_TYPE_CONFIG[claim.issueType as keyof typeof ISSUE_TYPE_CONFIG]?.label || claim.issueType,
        "Nội Dung Vấn Đề": claim.issueDescription || "",
        "Ngày Phát Hiện": formatDateVN(claim.detectedDate),
        "Ngày Tồn Đọng": `${daysPending} ngày`,
        "TT Xử Lý":
          CLAIM_STATUS_CONFIG[claim.claimStatus as keyof typeof CLAIM_STATUS_CONFIG]?.label || claim.claimStatus,
        "Nội Dung Xử Lý": claim.processingContent || "",
        "Thời Hạn": formatDateVN(claim.deadline),
        "Số Tiền NVC Đền Bù (đ)": Number(claim.carrierCompensation || 0),
        "Số Tiền Đền Bù KH (đ)": Number(claim.customerCompensation || 0),
        "Hoàn Tất": claim.isCompleted ? "Đã hoàn tất" : "Chưa",
        Nguồn: SOURCE_LABELS[claim.source] || claim.source,
        "Người Tạo": claim.createdBy?.name || "",
        "Ngày Tạo": formatDateVN(claim.createdAt),
        "Người Nhận": claim.order?.receiverName || "",
        "SĐT Người Nhận": claim.order?.receiverPhone || "",
        "Ghi Chú NB": claim.order?.staffNotes || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const worksheetHeaders = Object.keys(rows[0] || {});
    worksheet["!cols"] = worksheetHeaders.map((key) => ({ wch: Math.max(key.length + 2, 14) }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Đơn Có Vấn Đề");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const timestamp = new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }).replace(/\//g, "");

    const headers = new Headers({
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"don-co-van-de-${timestamp}.xlsx\"`,
    });

    if (claims.length === EXPORT_LIMIT) {
      headers.set("X-Claims-Export-Truncated", "true");
    }

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("GET /api/claims/export error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
