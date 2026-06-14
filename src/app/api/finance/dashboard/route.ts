import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { getFinanceDashboardData } from "@/lib/finance/dashboard";
import { parsePeriodFromURL } from "@/lib/finance-period";

export async function GET(req: NextRequest) {
  const { error } = await requireFinanceAccess();
  if (error) return error;
  const data = await getFinanceDashboardData(parsePeriodFromURL(new URL(req.url)));
  return NextResponse.json(data);
}
