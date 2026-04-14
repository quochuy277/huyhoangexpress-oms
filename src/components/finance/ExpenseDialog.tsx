"use client";

import type { FinanceCategoryOption } from "@/lib/finance/landing";

interface ExpenseFormState {
  categoryId: string;
  title: string;
  amount: string;
  date: string;
  note: string;
}

interface ExpenseDialogProps {
  isEditing: boolean;
  expForm: ExpenseFormState;
  categories: FinanceCategoryOption[];
  onFormChange: (form: ExpenseFormState) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function ExpenseDialog({
  isEditing,
  expForm,
  categories,
  onFormChange,
  onSave,
  onClose,
}: ExpenseDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[min(92vw,520px)] max-h-[85vh] overflow-auto rounded-xl border-[1.5px] border-blue-600 bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-bold">{isEditing ? "Sửa khoản chi" : "Thêm khoản chi"}</h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-500">Danh mục *</label>
            <select
              value={expForm.categoryId}
              onChange={(e) => onFormChange({ ...expForm, categoryId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Chọn</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-500">Tên khoản chi *</label>
            <input
              value={expForm.title}
              onChange={(e) => onFormChange({ ...expForm, title: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-500">Số tiền (VND) *</label>
            <input
              type="number"
              value={expForm.amount}
              onChange={(e) => onFormChange({ ...expForm, amount: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-500">Ngày *</label>
            <input
              type="date"
              value={expForm.date}
              onChange={(e) => onFormChange({ ...expForm, date: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-slate-500">Ghi chú</label>
            <input
              value={expForm.note}
              onChange={(e) => onFormChange({ ...expForm, note: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
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
