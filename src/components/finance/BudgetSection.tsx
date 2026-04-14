"use client";

import { memo } from "react";
import { buildBudgetSummary } from "./financeResponsive";
import type { FinanceBudgetSummary } from "@/lib/finance/landing";

const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

interface BudgetSectionProps {
  isAdmin: boolean;
  budgets: FinanceBudgetSummary;
  onOpenBudgetDialog: () => void;
}

function BudgetSectionInner({ isAdmin, budgets, onOpenBudgetDialog }: BudgetSectionProps) {
  const budgetCards = budgets.budgets?.map((budget: any) => buildBudgetSummary(budget)) ?? [];
  const panelClass = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";

  return (
    <div className={panelClass}>
      {budgets.hasAlert && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-800">
          ⚠️ Có danh mục chi phí đã vượt 90% ngân sách!
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold text-slate-800">💰 Ngân sách hàng tháng — {budgets.month}</h3>
        {isAdmin && (
          <button
            onClick={onOpenBudgetDialog}
            className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
          >
            ⚙ Đặt ngân sách
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b-2 border-slate-200 p-2.5 text-left">Danh Mục</th>
              <th className="border-b-2 border-slate-200 p-2.5 text-right">Ngân Sách</th>
              <th className="border-b-2 border-slate-200 p-2.5 text-right">Đã Chi</th>
              <th className="border-b-2 border-slate-200 p-2.5 text-right">Còn Lại</th>
              <th className="border-b-2 border-slate-200 p-2.5 text-center">Tỷ Lệ</th>
              <th className="border-b-2 border-slate-200 p-2.5 text-center">Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
            {budgets.budgets?.map((b: any) => (
              <tr key={b.categoryId} className="border-b border-slate-100">
                <td className="p-2">{b.categoryName}</td>
                <td className="p-2 text-right">{b.budgetAmount > 0 ? fmtVND(b.budgetAmount) : "—"}</td>
                <td className="p-2 text-right font-semibold">{fmtVND(b.spent)}</td>
                <td className={`p-2 text-right ${b.remaining >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {b.budgetAmount > 0 ? fmtVND(b.remaining) : "—"}
                </td>
                <td className="p-2 text-center">
                  {b.budgetAmount > 0 && (
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="h-1.5 w-[60px] rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${
                            b.ratio > 90 ? "bg-red-500" : b.ratio > 70 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(b.ratio, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs">{b.ratio}%</span>
                    </div>
                  )}
                </td>
                <td className="p-2 text-center">
                  {b.budgetAmount > 0
                    ? b.ratio > 90
                      ? "🔴 Sắp vượt"
                      : b.ratio > 70
                        ? "🟡 Gần hết"
                        : "🟢 Bình thường"
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {budgetCards.map((budget: any, index: number) => {
          const rawBudget = budgets.budgets[index];
          const toneClass =
            budget.statusTone === "danger"
              ? "text-red-600"
              : budget.statusTone === "warning"
                ? "text-amber-600"
                : "text-emerald-600";

          return (
            <div key={budget.categoryId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{budget.categoryName}</div>
                  <div className={`mt-1 text-xs font-semibold ${toneClass}`}>{budget.statusLabel}</div>
                </div>
                <div className="text-right text-sm font-bold text-slate-800">{budget.ratioLabel}</div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    budget.statusTone === "danger"
                      ? "bg-red-500"
                      : budget.statusTone === "warning"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(rawBudget.ratio, 100)}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Ngân sách</div>
                  <div className="font-semibold text-slate-800">{budget.budgetLabel}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Đã chi</div>
                  <div className="font-semibold text-slate-800">{budget.spentLabel}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-500">Còn lại</div>
                  <div className={`font-semibold ${rawBudget.remaining >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {budget.remainingLabel}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const BudgetSection = memo(BudgetSectionInner);
