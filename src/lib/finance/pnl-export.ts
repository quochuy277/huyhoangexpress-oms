import { buildXlsxBuffer } from "@/lib/xlsx-export";
import { computeDeltaPercent } from "@/lib/finance/compare";
import type { FinancePnlData } from "@/lib/finance/landing";

export function buildPnlExportRows(
  current: FinancePnlData,
  previous?: FinancePnlData | null,
): { headers: string[]; rows: (string | number)[][] } {
  const cmp = !!previous;
  const headers = cmp ? ["Khoản mục", "Kỳ này", "Kỳ trước", "Δ%"] : ["Khoản mục", "Số tiền"];
  const line = (label: string, cur: number, prev: number | undefined): (string | number)[] => {
    if (cmp) {
      const p = prev ?? 0;
      const d = computeDeltaPercent(cur, p);
      return [label, cur, p, d === null ? "" : d];
    }
    return [label, cur];
  };
  const p = previous;
  const rows: (string | number)[][] = [
    line("Tổng phí thu từ shop", current.revenue.totalFeeFromShop, p?.revenue.totalFeeFromShop),
    line("Trừ phí NVC", -current.revenue.totalCarrierFee, p ? -p.revenue.totalCarrierFee : undefined),
    line("DOANH THU RÒNG", current.revenue.netRevenue, p?.revenue.netRevenue),
    line("Chênh lệch đền bù", current.claims.claimDiff, p?.claims.claimDiff),
    line("LỢI NHUẬN GỘP", current.grossProfit, p?.grossProfit),
    line("Tổng chi phí vận hành", -current.totalOperatingExpenses, p ? -p.totalOperatingExpenses : undefined),
    line("LỢI NHUẬN RÒNG", current.netProfit, p?.netProfit),
  ];
  return { headers, rows };
}

export function buildPnlWorkbook(current: FinancePnlData, previous?: FinancePnlData | null): ArrayBuffer {
  const { headers, rows } = buildPnlExportRows(current, previous);
  return buildXlsxBuffer(headers, rows, "P&L");
}
