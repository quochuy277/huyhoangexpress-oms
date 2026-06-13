"use client";

import dynamic from "next/dynamic";

const CashbookTab = dynamic(() => import("@/components/finance/CashbookTab"), {
  loading: () => <div className="flex h-96 items-center justify-center text-slate-400">Đang tải...</div>,
});

export default function CashbookPageClient({ initialData }: { initialData?: unknown }) {
  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">🏦 Sổ quỹ</h1>
        <p className="mt-1 text-sm text-slate-500">Đối soát dòng tiền COD, trả shop và số dư quỹ.</p>
      </div>
      <CashbookTab initialData={initialData} />
    </div>
  );
}
