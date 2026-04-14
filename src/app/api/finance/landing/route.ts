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
    const data = await getFinanceLandingData({
      overviewRange: parsePeriodFromURL(url),
      pnlRange: resolvePnlRange(
        url.searchParams.get("pnlFrom"),
        url.searchParams.get("pnlTo"),
      ),
    });

    return NextResponse.json(data);
  } catch (error) {
    logger.error("GET /api/finance/landing", "Error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
