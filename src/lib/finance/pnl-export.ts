import { buildXlsxBuffer } from "@/lib/xlsx-export";
import { computeDeltaPercent } from "@/lib/finance/compare";
import type { FinancePnlData } from "@/lib/finance/landing";

export function buildPnlExportRows(
  current: FinancePnlData,
  previous?: FinancePnlData | null,
): { headers: string[]; rows: (string | number)[][] } {
  const cmp = !!previous;
  const headers = cmp ? ["Khoản mục", "Kỳ này", "Kỳ trước", "Δ%"] : ["Khoản mục", "Số tiền"];
  // Các dòng chi phí hiển thị giá trị âm để cột số tạo thành phép cộng waterfall
  // (mỗi tiểu tổng = tổng các dòng phía trên). Δ% lại cần tính theo ĐỘ LỚN chi phí
  // (deltaCur/deltaPrev), để "chi phí tăng" ra Δ dương — khớp bảng trên màn hình và
  // tránh bị đảo dấu do tính phần trăm trên số âm.
  const line = (
    label: string,
    cur: number,
    prev: number | undefined,
    deltaCur: number = cur,
    deltaPrev: number | undefined = prev,
  ): (string | number)[] => {
    if (cmp) {
      const p = prev ?? 0;
      const d = computeDeltaPercent(deltaCur, deltaPrev ?? 0);
      return [label, cur, p, d === null ? "" : d];
    }
    return [label, cur];
  };
  const p = previous;
  const rows: (string | number)[][] = [
    line("Tổng phí thu từ shop", current.revenue.totalFeeFromShop, p?.revenue.totalFeeFromShop),
    line(
      "Trừ phí NVC",
      -current.revenue.totalCarrierFee,
      p ? -p.revenue.totalCarrierFee : undefined,
      current.revenue.totalCarrierFee,
      p?.revenue.totalCarrierFee,
    ),
    line("DOANH THU RÒNG", current.revenue.netRevenue, p?.revenue.netRevenue),
    line("Chênh lệch đền bù", current.claims.claimDiff, p?.claims.claimDiff),
    line("LỢI NHUẬN GỘP", current.grossProfit, p?.grossProfit),
    line(
      "Tổng chi phí vận hành",
      -current.totalOperatingExpenses,
      p ? -p.totalOperatingExpenses : undefined,
      current.totalOperatingExpenses,
      p?.totalOperatingExpenses,
    ),
    line("LỢI NHUẬN RÒNG", current.netProfit, p?.netProfit),
  ];
  return { headers, rows };
}

export function buildPnlWorkbook(current: FinancePnlData, previous?: FinancePnlData | null): ArrayBuffer {
  const { headers, rows } = buildPnlExportRows(current, previous);
  return buildXlsxBuffer(headers, rows, "P&L");
}
