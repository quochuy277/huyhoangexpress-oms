"use client";

import type { FinanceCategoryOption } from "@/lib/finance/landing";

interface CategoryDialogProps {
  categories: FinanceCategoryOption[];
  newCat: string;
  onNewCatChange: (value: string) => void;
  onAddCategory: () => void;
  onDeleteCategory: (id: string) => void;
  onClose: () => void;
}

export default function CategoryDialog({
  categories,
  newCat,
  onNewCatChange,
  onAddCategory,
  onDeleteCategory,
  onClose,
}: CategoryDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-[min(92vw,520px)] max-h-[85vh] overflow-auto rounded-xl border-[1.5px] border-blue-600 bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-bold">⚙ Quản lý danh mục</h3>
        {categories.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between border-b border-slate-100 py-2">
            <span>
              {c.name}{" "}
              {c.isSystem && <span className="text-[10px] text-slate-400">(hệ thống)</span>}
            </span>
            {!c.isSystem && (
              <button
                onClick={() => onDeleteCategory(c.id)}
                className="cursor-pointer border-none bg-transparent text-red-500"
              >
                🗑
              </button>
            )}
          </div>
        ))}
        <div className="mt-3 flex gap-2">
          <input
            placeholder="Tên danh mục mới"
            value={newCat}
            onChange={(e) => onNewCatChange(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={onAddCategory}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Thêm
          </button>
        </div>
        <div className="mt-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
