"use client";

import type { FinanceCategoryOption } from "@/lib/finance/landing";

interface BudgetDialogProps {
  month: string;
  categories: FinanceCategoryOption[];
  budgetForm: Record<string, string>;
  onBudgetFormChange: (form: Record<string, string>) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function BudgetDialog({
  month,
  categories,
  budgetForm,
  onBudgetFormChange,
  onSave,
  onClose,
}: BudgetDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[min(92vw,520px)] max-h-[85vh] overflow-auto rounded-xl border-[1.5px] border-blue-600 bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-bold">⚙ Đặt ngân sách tháng {month}</h3>
        {categories.map((c: any) => (
          <div key={c.id} className="mb-2.5 flex items-center gap-2.5">
            <label className="flex-1 text-[13px]">{c.name}</label>
            <input
              type="number"
              value={budgetForm[c.id] || ""}
              onChange={(e) => onBudgetFormChange({ ...budgetForm, [c.id]: e.target.value })}
              className="w-[150px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="0"
            />
          </div>
        ))}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
