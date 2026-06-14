import { formatVnd } from "@/lib/finance/format";
import { computeDeltaPercent } from "@/lib/finance/compare";
import type { FinancePnlData } from "@/lib/finance/landing";

function DeltaCell({ current, previous, costRow = false }: { current: number; previous: number; costRow?: boolean }) {
  const d = computeDeltaPercent(current, previous);
  if (d === null) return <td className="px-2 py-1.5 text-right text-slate-400">—</td>;
  // For cost rows an increase is bad (red); for revenue/profit rows increase is good (green).
  const good = costRow ? d <= 0 : d >= 0;
  return (
    <td className={`px-2 py-1.5 text-right font-semibold ${good ? "text-emerald-500" : "text-red-500"}`}>
      {d >= 0 ? "+" : ""}{d}%
    </td>
  );
}

function Row({ label, cur, prev, costRow, indent }: { label: string; cur: number; prev: number; costRow?: boolean; indent?: boolean }) {
  return (
    <tr className="border-b border-slate-50">
      <td className={`py-1.5 ${indent ? "pl-6" : ""}`}>{label}</td>
      <td className="px-2 py-1.5 text-right">{formatVnd(cur)}</td>
      <td className="px-2 py-1.5 text-right text-slate-500">{formatVnd(prev)}</td>
      <DeltaCell current={cur} previous={prev} costRow={costRow} />
    </tr>
  );
}

interface Props {
  current: FinancePnlData;
  previous: FinancePnlData;
}

export function PnlComparisonTable({ current, previous }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200 text-xs text-slate-500">
            <th className="py-2 text-left">Khoản mục</th>
            <th className="px-2 py-2 text-right">Kỳ này ({current.month})</th>
            <th className="px-2 py-2 text-right">Kỳ trước ({previous.month})</th>
            <th className="px-2 py-2 text-right">Δ</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colSpan={4} className="pt-3 pb-1 font-bold text-blue-600">DOANH THU</td></tr>
          <Row indent label="Tổng phí thu từ shop" cur={current.revenue.totalFeeFromShop} prev={previous.revenue.totalFeeFromShop} />
          <Row indent label="Trừ phí NVC" cur={current.revenue.totalCarrierFee} prev={previous.revenue.totalCarrierFee} costRow />
          <tr className="border-t border-slate-200 font-bold text-blue-600">
            <td className="py-2">DOANH THU RÒNG</td>
            <td className="px-2 py-2 text-right">{formatVnd(current.revenue.netRevenue)}</td>
            <td className="px-2 py-2 text-right text-slate-500">{formatVnd(previous.revenue.netRevenue)}</td>
            <DeltaCell current={current.revenue.netRevenue} previous={previous.revenue.netRevenue} />
          </tr>

          <tr><td colSpan={4} className="pt-3 pb-1 font-bold text-red-500">CHI PHÍ TRỰC TIẾP (Claims)</td></tr>
          <Row indent label="Chênh lệch đền bù" cur={current.claims.claimDiff} prev={previous.claims.claimDiff} />

          <tr className="border-t-2 border-blue-600 bg-slate-50 font-bold text-blue-600">
            <td className="py-2.5">LỢI NHUẬN GỘP</td>
            <td className="px-2 py-2.5 text-right">{formatVnd(current.grossProfit)}</td>
            <td className="px-2 py-2.5 text-right text-slate-500">{formatVnd(previous.grossProfit)}</td>
            <DeltaCell current={current.grossProfit} previous={previous.grossProfit} />
          </tr>

          <tr><td colSpan={4} className="pt-3 pb-1 font-bold text-amber-500">CHI PHÍ VẬN HÀNH</td></tr>
          <Row indent label="Tổng chi phí vận hành" cur={current.totalOperatingExpenses} prev={previous.totalOperatingExpenses} costRow />

          <tr className={`border-t-2 border-slate-800 font-bold ${current.netProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
            <td className="py-3 text-[15px]">LỢI NHUẬN RÒNG</td>
            <td className={`px-2 py-3 text-right text-lg ${current.netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>{formatVnd(current.netProfit)}</td>
            <td className="px-2 py-3 text-right text-slate-500">{formatVnd(previous.netProfit)}</td>
            <DeltaCell current={current.netProfit} previous={previous.netProfit} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
