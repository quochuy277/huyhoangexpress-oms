import { NextRequest, NextResponse } from "next/server";

import { requireFinanceAccess } from "@/lib/finance-auth";
import { getFinanceLandingData, resolvePnlRange } from "@/lib/finance/landing";
import { parsePeriodFromURL } from "@/lib/finance-period";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const periodRange = parsePeriodFromURL(url);
    const pnlFrom = url.searchParams.get("pnlFrom");
    const pnlTo = url.searchParams.get("pnlTo");
    const data = await getFinanceLandingData({
      overviewRange: periodRange,
      // P&L tóm tắt bám theo kỳ đang chọn (khớp với KPI + biểu đồ). pnlFrom/pnlTo
      // vẫn cho phép override riêng cửa sổ P&L nếu sau này cần.
      pnlRange: pnlFrom && pnlTo ? resolvePnlRange(pnlFrom, pnlTo) : periodRange,
    });

    return NextResponse.json(data);
  } catch (error) {
    logger.error("GET /api/finance/landing", "Error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
