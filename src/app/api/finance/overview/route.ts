import { NextRequest, NextResponse } from "next/server";

import { requireFinanceAccess } from "@/lib/finance-auth";
import { getFinanceOverviewData } from "@/lib/finance/landing";
import { parsePeriodFromURL } from "@/lib/finance-period";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireFinanceAccess();
    if (error) return error;

    const data = await getFinanceOverviewData(parsePeriodFromURL(new URL(req.url)));
    return NextResponse.json(data);
  } catch (error) {
    console.error("Finance overview error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
