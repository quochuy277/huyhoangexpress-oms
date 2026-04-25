import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { CLAIM_STATUS_CONFIG, ISSUE_TYPE_CONFIG } from "@/lib/claims-config";
import { auth } from "@/lib/auth";
import { requireClaimsPermission } from "@/lib/claims-permissions";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { encodeCsvHeader, encodeCsvRows } from "@/lib/csv-stream";
import { exportLimiter } from "@/lib/rate-limiter";
import { createServerTiming } from "@/lib/server-timing";

// Streamed CSV export for ClaimOrder.
//
// Previously built the whole XLSX workbook in memory via `XLSX.write` — fine
// for a few hundred rows but costly at 3000+ (the current cap). Sprint 2
// (2026-04) switches to CSV streaming so peak memory is one batch (~500 rows)
// regardless of cap. If we ever need to lift the cap, the bottleneck won't be
// memory anymore.

const SOURCE_LABELS: Record<string, string> = {
  AUTO_SLOW_JOURNEY: "Tự động (hành trình chậm)",
  AUTO_INTERNAL_NOTE: "Tự động (ghi chú)",
  FROM_DELAYED: "Từ đơn hoãn",
  FROM_RETURNS: "Từ đơn hoàn",
  FROM_ORDERS: "Từ đơn hàng",
  MANUAL: "Thủ công",
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
  "STT", "Mã Yêu Cầu", "Mã ĐT Đối Tác", "Cửa Hàng", "Đối Tác Vận Chuyển",
  "Trạng Thái Đơn", "COD (đ)", "Tổng Phí (đ)", "Nhóm Vùng Miền",
  "Thời Gian Lấy Hàng", "Loại Vấn Đề", "Nội Dung Vấn Đề", "Ngày Phát Hiện",
  "Ngày Tồn Đọng", "TT Xử Lý", "Nội Dung Xử Lý", "Thời Hạn",
  "Số Tiền NVC Đền Bù (đ)", "Số Tiền Đền Bù KH (đ)", "Hoàn Tất",
  "Nguồn", "Người Tạo", "Ngày Tạo", "Người Nhận", "SĐT Người Nhận",
  "Ghi Chú NB",
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
    },
  },
  createdBy: { select: { name: true } },
} as const satisfies Prisma.ClaimOrderInclude;

type ClaimRow = Prisma.ClaimOrderGetPayload<{ include: typeof CLAIM_INCLUDE }>;

function buildClaimRow(claim: ClaimRow, index: number): unknown[] {
  const daysPending = Math.floor((Date.now() - new Date(claim.detectedDate).getTime()) / 86400000);

  return [
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
    ISSUE_TYPE_CONFIG[claim.issueType as keyof typeof ISSUE_TYPE_CONFIG]?.label || claim.issueType,
    claim.issueDescription || "",
    formatDateVN(claim.detectedDate),
    `${daysPending} ngày`,
    CLAIM_STATUS_CONFIG[claim.claimStatus as keyof typeof CLAIM_STATUS_CONFIG]?.label || claim.claimStatus,
    claim.processingContent || "",
    formatDateVN(claim.deadline),
    Number(claim.carrierCompensation || 0),
    Number(claim.customerCompensation || 0),
    claim.isCompleted ? "Đã hoàn tất" : "Chưa",
    SOURCE_LABELS[claim.source] || claim.source,
    claim.createdBy?.name || "",
    formatDateVN(claim.createdAt),
    claim.order?.receiverName || "",
    claim.order?.receiverPhone || "",
    claim.order?.staffNotes || "",
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

  // Count up-front so we can set `X-Claims-Export-Truncated` at response time
  // — headers can't be sent mid-stream, and the client UI relies on this flag
  // (see getClaimsExportTruncationMessage in useClaimMutations).
  // A count() is cheap compared to the export itself; on large datasets it
  // also makes debugging clearer (log shows matched vs exported).
  const totalMatching = await timing.measure("count", () =>
    prisma.claimOrder.count({ where }),
  );
  const truncated = totalMatching > EXPORT_LIMIT;

  const timestamp = new Date()
    .toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    .replace(/\//g, "");
  const filename = `don-co-van-de-${timestamp}.csv`;
  const timingHeader = timing.headerValue();

  const exportStart = performance.now();
  const stream = new ReadableStream({
    async start(controller) {
      let skip = 0;
      let exportedCount = 0;

      controller.enqueue(encodeCsvHeader(CLAIM_HEADERS));

      try {
        while (exportedCount < EXPORT_LIMIT) {
          const remaining = EXPORT_LIMIT - exportedCount;
          const take = Math.min(EXPORT_BATCH_SIZE, remaining);

          const batch = await prisma.claimOrder.findMany({
            where,
            include: CLAIM_INCLUDE,
            orderBy: { deadline: "asc" },
            skip,
            take,
          });

          if (batch.length === 0) break;

          const rows = batch.map((claim, i) => buildClaimRow(claim, exportedCount + i));
          controller.enqueue(encodeCsvRows(rows));

          exportedCount += batch.length;
          skip += batch.length;

          if (batch.length < take) break;
        }

        logger.info(
          "GET /api/claims/export",
          `Exported ${exportedCount}/${totalMatching} rows in ${(performance.now() - exportStart).toFixed(1)}ms${truncated ? " (truncated at cap)" : ""}`,
        );
        controller.close();
      } catch (error) {
        logger.error("GET /api/claims/export", "Error streaming", error);
        controller.error(error);
      }
    },
  });

  const responseHeaders: Record<string, string> = {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
    "Server-Timing": timingHeader,
    "X-Claims-Export-Limit": String(EXPORT_LIMIT),
  };
  if (truncated) {
    responseHeaders["X-Claims-Export-Truncated"] = "true";
  }

  return new NextResponse(stream, {
    status: 200,
    headers: responseHeaders,
  });
}
