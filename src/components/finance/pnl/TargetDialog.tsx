"use client";

import { useState } from "react";

interface TargetDialogProps {
  month: string; // "yyyy-MM"
  initialNetRevenue: number | null;
  initialNetProfit: number | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function TargetDialog({ month, initialNetRevenue, initialNetProfit, onSaved, onClose }: TargetDialogProps) {
  const [netRevenue, setNetRevenue] = useState(initialNetRevenue ? String(initialNetRevenue) : "");
  const [netProfit, setNetProfit] = useState(initialNetProfit ? String(initialNetProfit) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/finance/targets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        netRevenue: netRevenue ? parseFloat(netRevenue) : null,
        netProfit: netProfit ? parseFloat(netProfit) : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-base font-bold text-slate-800">🎯 Đặt mục tiêu tháng {month}</h3>
        <label className="mb-1 block text-sm font-semibold text-slate-600">Doanh thu ròng (đ)</label>
        <input
          type="number"
          value={netRevenue}
          onChange={(e) => setNetRevenue(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <label className="mb-1 block text-sm font-semibold text-slate-600">Lợi nhuận ròng (đ)</label>
        <input
          type="number"
          value={netProfit}
          onChange={(e) => setNetProfit(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Hủy</button>
          <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
