"use client";

import { memo, useMemo } from "react";
import { buildPnlSections } from "./financeResponsive";
import type { FinancePnlData } from "@/lib/finance/landing";

const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

const PNL_PERIODS = [
  { value: "month", label: "Tháng này" },
  { value: "quarter", label: "Quý này" },
  { value: "year", label: "Năm nay" },
  { value: "custom", label: "Tùy chọn" },
];

interface PnLSectionProps {
  pnl: FinancePnlData;
  pnlPeriod: string;
  pnlCustomFromInput: string;
  pnlCustomToInput: string;
  onPnlPeriodChange: (period: string) => void;
  onPnlCustomFromInputChange: (value: string) => void;
  onPnlCustomToInputChange: (value: string) => void;
  onApplyPnlCustomRange: () => void;
}

function PnLSectionInner({
  pnl,
  pnlPeriod,
  pnlCustomFromInput,
  pnlCustomToInput,
  onPnlPeriodChange,
  onPnlCustomFromInputChange,
  onPnlCustomToInputChange,
  onApplyPnlCustomRange,
}: PnLSectionProps) {
  const pnlSections = useMemo(() => buildPnlSections(pnl), [pnl]);
  const panelClass = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";

  const periodButtonClass = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
      active
        ? "border-blue-200 bg-blue-600 text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
    }`;

  return (
    <div className={panelClass}>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="text-base font-bold text-slate-800">📊 Kết quả kinh doanh — {pnl.month}</h3>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {PNL_PERIODS.map((p) => (
              <button key={p.value} onClick={() => onPnlPeriodChange(p.value)} className={periodButtonClass(pnlPeriod === p.value)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {pnlPeriod === "custom" && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[auto,1fr,auto,1fr,auto] xl:items-center">
          <label className="text-sm font-semibold text-slate-600">Từ</label>
          <input
            type="date"
            value={pnlCustomFromInput}
            onChange={(e) => onPnlCustomFromInputChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="text-sm font-semibold text-slate-600">Đến</label>
          <input
            type="date"
            value={pnlCustomToInput}
            onChange={(e) => onPnlCustomToInputChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button onClick={onApplyPnlCustomRange} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
            Áp dụng
          </button>
        </div>
      )}

      {/* Desktop P&L table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td colSpan={2} className="border-b border-slate-200 pb-1 pt-2.5 font-bold text-blue-600">
                DOANH THU (tự động từ đơn hàng)
              </td>
            </tr>
            <tr>
              <td className="px-4 py-1.5">Tổng Phí thu từ Shop</td>
              <td className="text-right">{fmtVND(pnl.revenue.totalFeeFromShop)}</td>
            </tr>
            <tr>
              <td className="px-4 py-1.5">Trừ Phí NVC (Phí Đối Tác Thu)</td>
              <td className="text-right text-red-500">-{fmtVND(pnl.revenue.totalCarrierFee)}</td>
            </tr>
            <tr className="border-t border-slate-200 font-bold">
              <td className="px-4 py-2">DOANH THU RÒNG</td>
              <td className="text-right text-blue-600">{fmtVND(pnl.revenue.netRevenue)}</td>
            </tr>

            <tr>
              <td colSpan={2} className="border-b border-slate-200 pb-1 pt-3.5 font-bold text-red-500">
                CHI PHÍ TRỰC TIẾP (tự động từ Claims)
              </td>
            </tr>
            <tr>
              <td className="px-4 py-1.5">Đền bù KH</td>
              <td className="text-right text-red-500">-{fmtVND(pnl.claims.customerComp)}</td>
            </tr>
            <tr>
              <td className="px-4 py-1.5">NVC đền bù</td>
              <td className="text-right text-emerald-500">+{fmtVND(pnl.claims.carrierComp)}</td>
            </tr>
            <tr className="border-t border-slate-200 font-semibold">
              <td className="px-4 py-2">Chênh lệch đền bù</td>
              <td className={`text-right ${pnl.claims.claimDiff >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {fmtVND(pnl.claims.claimDiff)}
              </td>
            </tr>

            <tr className="border-t-2 border-blue-600 bg-slate-50 font-bold">
              <td className="px-4 py-2.5">LỢI NHUẬN GỘP</td>
              <td className="text-right text-base text-blue-600">{fmtVND(pnl.grossProfit)}</td>
            </tr>

            <tr>
              <td colSpan={2} className="border-b border-slate-200 pb-1 pt-3.5 font-bold text-amber-500">
                CHI PHÍ VẬN HÀNH (nhập thủ công)
              </td>
            </tr>
            {pnl.operatingExpenses?.map((e: any, i: number) => (
              <tr key={i}>
                <td className="px-4 py-1.5">{e.name}</td>
                <td className="text-right text-red-500">-{fmtVND(e.total)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200 font-semibold">
              <td className="px-4 py-2">TỔNG CHI PHÍ VẬN HÀNH</td>
              <td className="text-right text-red-500">-{fmtVND(pnl.totalOperatingExpenses)}</td>
            </tr>

            <tr className={`border-t-2 border-slate-800 font-bold ${pnl.netProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <td className="px-4 py-3 text-[15px]">LỢI NHUẬN RÒNG</td>
              <td className={`text-right text-lg ${pnl.netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {fmtVND(pnl.netProfit)} {pnl.netProfit < 0 ? "🔴" : "🟢"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile P&L accordion */}
      <div className="space-y-3 md:hidden">
        {pnlSections.map((section) => (
          <details key={section.key} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800">
              <span>{section.title}</span>
              <span className="text-right text-xs font-bold text-slate-600">{section.summary}</span>
            </summary>
            <div className="space-y-2 border-t border-slate-200 bg-white px-4 py-3">
              {section.rows.map((row) => (
                <div key={`${section.key}-${row.label}`} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-slate-500">{row.label}</span>
                  <span className="text-right font-semibold text-slate-800">{row.value}</span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export const PnLSection = memo(PnLSectionInner);
