import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { getFinanceAlerts } from "@/lib/finance/alerts";
import { parsePeriodFromURL } from "@/lib/finance-period";

export async function GET(req: NextRequest) {
  const { error } = await requireFinanceAccess();
  if (error) return error;
  const alerts = await getFinanceAlerts(parsePeriodFromURL(new URL(req.url)));
  return NextResponse.json({ alerts });
}
