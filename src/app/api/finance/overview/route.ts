import { NextRequest, NextResponse } from "next/server";

import { requireFinanceAccess } from "@/lib/finance-auth";
import { logger } from "@/lib/logger";
import { getFinanceOverviewData } from "@/lib/finance/landing";
import { parsePeriodFromURL } from "@/lib/finance-period";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const data = await getFinanceOverviewData(parsePeriodFromURL(new URL(req.url)));
    return NextResponse.json(data);
  } catch (error) {
    logger.error("GET /api/finance/overview", "Error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
