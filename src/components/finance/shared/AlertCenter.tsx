"use client";

import Link from "next/link";
import type { FinanceAlert } from "@/lib/finance/alerts";

export function AlertCenter({ alerts }: { alerts: FinanceAlert[] }) {
  const count = alerts.length;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-base font-bold text-slate-800">
        ⚠️ Trung tâm cảnh báo{count > 0 && <span className="text-red-500"> ({count})</span>}
      </h3>
      {count === 0 ? (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✅ Không có cảnh báo trong kỳ.</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Link
              key={a.id}
              href={a.href}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 transition-colors ${
                a.severity === "critical" ? "border-red-200 bg-red-50 hover:bg-red-100" : "border-amber-200 bg-amber-50 hover:bg-amber-100"
              }`}
            >
              <span>{a.severity === "critical" ? "🔴" : "🟡"}</span>
              <span className="flex-1">
                <span className="block text-[13px] font-semibold text-slate-800">{a.title}</span>
                <span className="block text-xs text-slate-500">{a.detail}</span>
              </span>
              <span className="whitespace-nowrap text-xs font-bold text-blue-600">Xem →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
