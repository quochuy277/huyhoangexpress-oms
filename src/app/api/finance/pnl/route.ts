import { NextRequest, NextResponse } from "next/server";

import { requireFinanceAccess } from "@/lib/finance-auth";
import { logger } from "@/lib/logger";
import { buildPnlLabel, getFinancePnlData, resolvePnlRange } from "@/lib/finance/landing";
import { getPreviousRange, getYoyRange } from "@/lib/finance/compare";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const url = new URL(req.url);
    const range = resolvePnlRange(url.searchParams.get("from"), url.searchParams.get("to"));
    const compareTo = url.searchParams.get("compareTo");

    if (compareTo === "prev" || compareTo === "yoy") {
      const prevRange = compareTo === "yoy" ? getYoyRange(range) : getPreviousRange(range);
      const [current, previous] = await Promise.all([
        getFinancePnlData(range, buildPnlLabel(range.from, range.to)),
        getFinancePnlData(prevRange, buildPnlLabel(prevRange.from, prevRange.to)),
      ]);
      return NextResponse.json({ current, previous, compareMode: compareTo });
    }

    const data = await getFinancePnlData(range, buildPnlLabel(range.from, range.to));
    return NextResponse.json(data);
  } catch (error) {
    logger.error("GET /api/finance/pnl", "Error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
