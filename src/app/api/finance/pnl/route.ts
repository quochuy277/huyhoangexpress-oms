import { NextRequest, NextResponse } from "next/server";

import { requireFinanceAccess } from "@/lib/finance-auth";
import { logger } from "@/lib/logger";
import { buildPnlLabel, getFinancePnlData, resolvePnlRange } from "@/lib/finance/landing";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const range = resolvePnlRange(
      url.searchParams.get("from"),
      url.searchParams.get("to"),
    );
    const data = await getFinancePnlData(range, buildPnlLabel(range.from, range.to));

    return NextResponse.json(data);
  } catch (error) {
    logger.error("GET /api/finance/pnl", "Error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
