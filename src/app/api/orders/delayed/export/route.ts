import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { processDelayedOrder, type ProcessedDelayedOrder } from "@/lib/delay-analyzer";
import { applyDelayedFilters, buildDelayedExportRows } from "@/lib/delayed-data";
import {
  buildDelayedOrdersWhere,
  DELAYED_EXPORT_BATCH_SIZE,
  DELAYED_ORDER_SELECT,
  getDelayedExportOrderBy,
} from "@/lib/delayed-query";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { exportLimiter } from "@/lib/rate-limiter";
import { requirePermission } from "@/lib/route-permissions";
import { buildXlsxBuffer } from "@/lib/xlsx-export";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const denied = requirePermission(
    session.user,
    "canViewDelayed",
    "Bạn không có quyền xuất danh sách đơn hoãn",
  );
  if (denied) return denied;

  const rateLimited = exportLimiter.check(session.user.id!);
  if (rateLimited) {
    return rateLimited;
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const shopFilter = searchParams.get("shop") || "";
  const carrierFilter = searchParams.get("carrier") || "";
  const riskFilter = searchParams.get("risk") || "";
  const reasonFilter = searchParams.get("reason") || "";
  const delayCountFilter = searchParams.get("delay") || "";
  const statusFilter = searchParams.get("status") || "";
  const todayOnly = searchParams.get("today") === "1";
  const sortKey = (searchParams.get("sortKey") || "delayCount") as keyof ProcessedDelayedOrder;
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const headers = [
    "STT",
    "Mã Yêu Cầu",
    "Mã Đơn KH",
    "Mã Đơn Đối Tác",
    "Shop",
    "Người Nhận",
    "SDT",
    "Địa Chỉ",
    "Trạng Thái",
    "Số Lần Hoãn",
    "Mức Độ Rủi Ro",
    "COD (VND)",
    "Lý Do",
  ];

  const exportStart = performance.now();

  try {
    let skip = 0;
    let exportIndex = 1;
    const allRows: unknown[][] = [];

    while (true) {
      const batch = await prisma.order.findMany({
        where: buildDelayedOrdersWhere({
          search,
          shopFilter,
          carrierFilter,
          statusFilter,
        }),
        select: DELAYED_ORDER_SELECT,
        orderBy: getDelayedExportOrderBy(sortKey, sortDir),
        skip,
        take: DELAYED_EXPORT_BATCH_SIZE,
      });

      if (batch.length === 0) break;

      let processedOrders = batch.map((order) => processDelayedOrder(order));
      processedOrders = applyDelayedFilters(processedOrders, {
        search: "",
        shop: "",
        status: "",
        delay: delayCountFilter,
        reason: reasonFilter,
        risk: riskFilter || "all",
        today: todayOnly,
      });

      if (processedOrders.length > 0) {
        const csvRows = buildDelayedExportRows(processedOrders, exportIndex);
        for (const row of csvRows) {
          allRows.push(Object.values(row));
        }
        exportIndex += csvRows.length;
      }

      if (batch.length < DELAYED_EXPORT_BATCH_SIZE) break;
      skip += DELAYED_EXPORT_BATCH_SIZE;
    }

    const xlsxBuffer = buildXlsxBuffer(headers, allRows);

    logger.info("GET /api/orders/delayed/export", `Exported ${allRows.length} rows in ${(performance.now() - exportStart).toFixed(1)}ms`);

    return new NextResponse(xlsxBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="delayed-${timestamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("GET /api/orders/delayed/export", "Error building XLSX", error);
    return NextResponse.json({ error: "Lỗi xuất file" }, { status: 500 });
  }
}
