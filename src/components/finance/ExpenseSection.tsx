"use client";

import { memo, useCallback } from "react";
import { buildExpenseSummary } from "./financeResponsive";

type ExpenseItem = {
  id: string;
  categoryId: string;
  title: string;
  amount: number;
  date: string;
  note?: string | null;
  category?: { name?: string | null } | null;
};

const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

interface ExpenseSectionProps {
  isAdmin: boolean;
  expenses: ExpenseItem[];
  shouldFetchExpenses: boolean;
  onOpenCatDialog: () => void;
  onAddExpense: () => void;
  onEditExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (id: string) => void;
}

function ExpenseSectionInner({
  isAdmin,
  expenses,
  shouldFetchExpenses,
  onOpenCatDialog,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}: ExpenseSectionProps) {
  const expenseCards = expenses.map((expense) => buildExpenseSummary(expense));
  const panelClass = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";

  return (
    <div className={panelClass}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold text-slate-800">📝 Quản lý khoản chi</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          {isAdmin && (
            <button
              onClick={onOpenCatDialog}
              className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
            >
              ⚙ Quản lý danh mục
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onAddExpense}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Thêm khoản chi
            </button>
          )}
        </div>
      </div>

      {!shouldFetchExpenses && expenses.length === 0 && (
        <div className="mb-4 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
          Đang tải danh sách khoản chi...
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-slate-50">
              <th className="border-b-2 border-slate-200 p-2.5 text-left">#</th>
              <th className="border-b-2 border-slate-200 p-2.5 text-left">Ngày</th>
              <th className="border-b-2 border-slate-200 p-2.5 text-left">Danh Mục</th>
              <th className="border-b-2 border-slate-200 p-2.5 text-left">Tên Khoản Chi</th>
              <th className="border-b-2 border-slate-200 p-2.5 text-right">Số Tiền</th>
              <th className="border-b-2 border-slate-200 p-2.5 text-left">Ghi Chú</th>
              {isAdmin && <th className="border-b-2 border-slate-200 p-2.5 text-center">Thao Tác</th>}
            </tr>
          </thead>
          <tbody>
            {expenses.map((e, i) => (
              <tr key={e.id} className="border-b border-slate-100">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">{new Date(e.date).toLocaleDateString("vi-VN")}</td>
                <td className="p-2">{e.category?.name}</td>
                <td className="p-2">{e.title}</td>
                <td className="p-2 text-right font-semibold">{fmtVND(e.amount)}</td>
                <td className="p-2 text-slate-500">{e.note || "—"}</td>
                {isAdmin && (
                  <td className="p-2 text-center">
                    <button
                      onClick={() => onEditExpense(e)}
                      className="mr-2 cursor-pointer border-none bg-transparent"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDeleteExpense(e.id)}
                      className="cursor-pointer border-none bg-transparent"
                    >
                      🗑
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="p-5 text-center text-slate-400">
                  Chưa có khoản chi nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {!shouldFetchExpenses && expenseCards.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
            Đang tải danh sách khoản chi...
          </div>
        )}
        {shouldFetchExpenses && expenseCards.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
            Chưa có khoản chi nào
          </div>
        )}
        {expenseCards.map((expense, index) => {
          const rawExpense = expenses[index];
          return (
            <details key={expense.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex list-none items-start justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{expense.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {expense.categoryName} • {expense.dateLabel}
                  </div>
                </div>
                <div className="text-right text-sm font-bold text-slate-800">{expense.amountLabel}</div>
              </summary>
              <div className="space-y-3 border-t border-slate-200 bg-white px-4 py-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Ghi chú</span>
                  <span className="text-right text-slate-700">{expense.noteLabel}</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditExpense(rawExpense)}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={() => onDeleteExpense(rawExpense.id)}
                      className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                    >
                      Xóa
                    </button>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

export const ExpenseSection = memo(ExpenseSectionInner);
