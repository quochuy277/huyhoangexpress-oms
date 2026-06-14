import { NextRequest, NextResponse } from "next/server";
import { requireFinanceAccess } from "@/lib/finance-auth";
import { buildPnlLabel, getFinancePnlData, resolvePnlRange, type FinancePnlData } from "@/lib/finance/landing";
import { getPreviousRange, getYoyRange } from "@/lib/finance/compare";
import { buildPnlWorkbook } from "@/lib/finance/pnl-export";

export async function GET(req: NextRequest) {
  const { error } = await requireFinanceAccess();
  if (error) return error;

  const url = new URL(req.url);
  const range = resolvePnlRange(url.searchParams.get("from"), url.searchParams.get("to"));
  const compareTo = url.searchParams.get("compareTo");
  const current = await getFinancePnlData(range, buildPnlLabel(range.from, range.to));
  let previous: FinancePnlData | null = null;
  if (compareTo === "prev" || compareTo === "yoy") {
    const prevRange = compareTo === "yoy" ? getYoyRange(range) : getPreviousRange(range);
    previous = await getFinancePnlData(prevRange, buildPnlLabel(prevRange.from, prevRange.to));
  }

  const buffer = buildPnlWorkbook(current, previous);
  const fromStr = range.from.toISOString().slice(0, 10);
  const toStr = range.to.toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bao-cao-pnl-${fromStr}_${toStr}.xlsx"`,
    },
  });
}
