import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { CLAIM_STATUS_CONFIG, ISSUE_TYPE_CONFIG } from "@/lib/claims-config";
import { auth } from "@/lib/auth";
import { requireClaimsPermission } from "@/lib/claims-permissions";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { buildXlsxBuffer } from "@/lib/xlsx-export";
import { exportLimiter } from "@/lib/rate-limiter";
import { createServerTiming } from "@/lib/server-timing";

const SOURCE_LABELS: Record<string, string> = {
  AUTO_SLOW_JOURNEY: "Tự động (hành trình chậm)",
  AUTO_INTERNAL_NOTE: "Tự động (ghi chú)",
  FROM_DELAYED: "Từ đơn hoãn",
  FROM_RETURNS: "Từ đơn hoàn",
  FROM_ORDERS: "Từ đơn hàng",
  MANUAL: "Thủ công",
};

const FIELD_LABEL_MAP: Record<string, string> = {
  claimStatus: "Trạng thái xử lý",
  issueType: "Loại vấn đề",
  issueDescription: "Nội dung vấn đề",
  processingContent: "Nội dung xử lý",
  carrierCompensation: "NVC đền bù",
  customerCompensation: "Đền bù KH",
  deadline: "Thời hạn",
};

const EXPORT_LIMIT = 3000;
const EXPORT_BATCH_SIZE = 500;

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

const CLAIM_HEADERS = [
  // Thông tin đơn hàng
  "STT", "Mã Yêu Cầu", "Mã ĐT Đối Tác", "Cửa Hàng", "Đối Tác Vận Chuyển",
  "Trạng Thái Đơn", "COD (đ)", "Tổng Phí (đ)", "Nhóm Vùng Miền",
  "Thời Gian Lấy Hàng", "Ghi Chú Nội Bộ",
  // Thông tin vấn đề
  "Loại Vấn Đề", "Nội Dung Vấn Đề", "Ngày Phát Hiện", "Ngày Tồn Đọng", "Thời Hạn",
  // Xử lý
  "TT Xử Lý", "Nội Dung Xử Lý", "Số Tiền NVC Đền Bù (đ)", "Số Tiền Đền Bù KH (đ)",
  "Hoàn Tất", "Ngày Hoàn Tất", "Người Hoàn Tất",
  // Thông tin chung
  "Nguồn", "Người Tạo", "Ngày Tạo", "Người Nhận", "SĐT Người Nhận",
  // Lịch sử thay đổi
  "Lịch Sử Thay Đổi",
] as const;

const CLAIM_INCLUDE = {
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
      internalNotes: true,
    },
  },
  createdBy: { select: { name: true } },
  statusHistory: {
    orderBy: { changedAt: "desc" as const },
    take: 50,
  },
  changeLogs: {
    orderBy: { changedAt: "desc" as const },
    take: 50,
  },
} as const satisfies Prisma.ClaimOrderInclude;

type ClaimRow = Prisma.ClaimOrderGetPayload<{ include: typeof CLAIM_INCLUDE }>;

function getDisplayValue(fieldName: string, value: string | null): string {
  if (!value) return "—";
  if (fieldName === "claimStatus") {
    return CLAIM_STATUS_CONFIG[value as keyof typeof CLAIM_STATUS_CONFIG]?.label || value;
  }
  if (fieldName === "issueType") {
    return ISSUE_TYPE_CONFIG[value as keyof typeof ISSUE_TYPE_CONFIG]?.label || value;
  }
  if (fieldName === "carrierCompensation" || fieldName === "customerCompensation") {
    return `${Number(parseFloat(value) || 0).toLocaleString("vi-VN")}đ`;
  }
  if (fieldName === "deadline") {
    try {
      return formatDateVN(value);
    } catch {
      return value;
    }
  }
  return value;
}

function buildHistoryText(claim: ClaimRow): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeline: any[] = [];

  if (claim.statusHistory) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    claim.statusHistory.forEach((entry: any) => timeline.push({ type: "status", ...entry }));
  }
  if (claim.changeLogs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    claim.changeLogs.forEach((entry: any) => {
      if (entry.fieldName !== "claimStatus") {
        timeline.push({ type: "change", ...entry });
      }
    });
  }

  timeline.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

  if (timeline.length === 0) return "";

  return timeline.map((item) => {
    const time = formatDateTimeVN(item.changedAt);
    const who = item.changedBy || "";

    if (item.type === "status") {
      const from = CLAIM_STATUS_CONFIG[item.fromStatus as keyof typeof CLAIM_STATUS_CONFIG]?.label || item.fromStatus;
      const to = CLAIM_STATUS_CONFIG[item.toStatus as keyof typeof CLAIM_STATUS_CONFIG]?.label || item.toStatus;
      const line = `[${time}] ${who}: TT Xử lý ${from} → ${to}`;
      return item.note ? `${line} (${item.note})` : line;
    }

    const label = FIELD_LABEL_MAP[item.fieldName] || item.fieldName;
    const oldVal = getDisplayValue(item.fieldName, item.oldValue);
    const newVal = getDisplayValue(item.fieldName, item.newValue);
    return `[${time}] ${who}: ${label} ${oldVal} → ${newVal}`;
  }).join("\n");
}

function buildClaimRow(claim: ClaimRow, index: number): unknown[] {
  const daysPending = Math.floor((Date.now() - new Date(claim.detectedDate).getTime()) / 86400000);

  return [
    // Thông tin đơn hàng
    index + 1,
    claim.order?.requestCode || "",
    claim.order?.carrierOrderCode || "",
    claim.order?.shopName || "",
    claim.order?.carrierName || "",
    claim.order?.status || "",
    Number(claim.order?.codAmount || 0),
    Number(claim.order?.totalFee || 0),
    claim.order?.regionGroup || "",
    formatDateTimeVN(claim.order?.pickupTime || null),
    claim.order?.internalNotes || "",
    // Thông tin vấn đề
    ISSUE_TYPE_CONFIG[claim.issueType as keyof typeof ISSUE_TYPE_CONFIG]?.label || claim.issueType,
    claim.issueDescription || "",
    formatDateVN(claim.detectedDate),
    `${daysPending} ngày`,
    formatDateVN(claim.deadline),
    // Xử lý
    CLAIM_STATUS_CONFIG[claim.claimStatus as keyof typeof CLAIM_STATUS_CONFIG]?.label || claim.claimStatus,
    claim.processingContent || "",
    Number(claim.carrierCompensation || 0),
    Number(claim.customerCompensation || 0),
    claim.isCompleted ? "Đã hoàn tất" : "Chưa",
    claim.completedAt ? formatDateTimeVN(claim.completedAt) : "",
    claim.completedBy || "",
    // Thông tin chung
    SOURCE_LABELS[claim.source] || claim.source,
    claim.createdBy?.name || "",
    formatDateVN(claim.createdAt),
    claim.order?.receiverName || "",
    claim.order?.receiverPhone || "",
    // Lịch sử thay đổi
    buildHistoryText(claim),
  ];
}

export async function GET(req: NextRequest) {
  const timing = createServerTiming();

  const session = await timing.measure("auth", () => auth());
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401, headers: timing.headers() });
  }
  const denied = requireClaimsPermission(session.user, "canViewClaims");
  if (denied) return denied;

  const rateLimited = exportLimiter.check(session.user.id!);
  if (rateLimited) return rateLimited;

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where.issueType = { in: issueType.split(",") as any[] };
  }

  if (claimStatus) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  if (shopName) orderWhere.shopName = shopName;
  if (orderStatus) orderWhere.status = orderStatus;
  if (Object.keys(orderWhere).length > 0) where.order = orderWhere;

  const totalMatching = await timing.measure("count", () =>
    prisma.claimOrder.count({ where }),
  );
  const truncated = totalMatching > EXPORT_LIMIT;

  const exportStart = performance.now();
  const allRows: unknown[][] = [];
  let skip = 0;

  while (allRows.length < EXPORT_LIMIT) {
    const remaining = EXPORT_LIMIT - allRows.length;
    const take = Math.min(EXPORT_BATCH_SIZE, remaining);

    const batch = await prisma.claimOrder.findMany({
      where,
      include: CLAIM_INCLUDE,
      orderBy: { deadline: "asc" },
      skip,
      take,
    });

    if (batch.length === 0) break;

    for (const claim of batch) {
      allRows.push(buildClaimRow(claim, allRows.length));
    }

    skip += batch.length;
    if (batch.length < take) break;
  }

  const buffer = buildXlsxBuffer(CLAIM_HEADERS, allRows, "Đơn Có Vấn Đề");

  const timestamp = new Date()
    .toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    .replace(/\//g, "");
  const filename = `don-co-van-de-${timestamp}.xlsx`;

  logger.info(
    "GET /api/claims/export",
    `Exported ${allRows.length}/${totalMatching} rows in ${(performance.now() - exportStart).toFixed(1)}ms${truncated ? " (truncated at cap)" : ""}`,
  );

  const responseHeaders: Record<string, string> = {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
    "Server-Timing": timing.headerValue(),
    "X-Claims-Export-Limit": String(EXPORT_LIMIT),
  };
  if (truncated) {
    responseHeaders["X-Claims-Export-Truncated"] = "true";
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: responseHeaders,
  });
}
