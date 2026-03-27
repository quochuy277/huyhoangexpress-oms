"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const OverviewTab = dynamic(() => import("./OverviewTab"), { loading: () => <div className="h-96 flex items-center justify-center text-slate-400">Đang tải...</div> });
const AnalysisTab = dynamic(() => import("./AnalysisTab"), { ssr: false, loading: () => <div className="h-96 flex items-center justify-center text-slate-400">Đang tải...</div> });
const CashbookTab = dynamic(() => import("./CashbookTab"), { ssr: false, loading: () => <div className="h-96 flex items-center justify-center text-slate-400">Đang tải...</div> });

const TABS = [
  { id: "overview", label: "Tổng quan & P&L" },
  { id: "analysis", label: "Phân tích" },
  { id: "cashbook", label: "Sổ quỹ" },
];

interface Props { isAdmin: boolean; initialCategories?: any[]; }

export default function FinancePageClient({ isAdmin, initialCategories }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(tabParam);
  // Lazy mount: chỉ mount tab khi user mở lần đầu
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set([tabParam]));

  useEffect(() => { setActiveTab(tabParam); }, [tabParam]);

  const switchTab = useCallback((tab: string) => {
    setActiveTab(tab);
    setMountedTabs(prev => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/finance?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="mb-4 sm:mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">💰 Tài Chính</h1>
        <p className="mt-1 text-sm text-slate-500">
          Theo dõi tổng quan tài chính, phân tích hiệu quả và đối soát sổ quỹ.
        </p>
      </div>
      <div className="mb-5 overflow-x-auto border-b border-slate-200 pb-1 sm:mb-6">
        <div className="flex min-w-max gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === t.id
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
        </div>
      </div>
      {mountedTabs.has("overview") && (
        <div style={{ display: activeTab === "overview" ? "block" : "none" }}>
          <OverviewTab isAdmin={isAdmin} initialCategories={initialCategories} />
        </div>
      )}
      {mountedTabs.has("analysis") && (
        <div style={{ display: activeTab === "analysis" ? "block" : "none" }}>
          <AnalysisTab />
        </div>
      )}
      {mountedTabs.has("cashbook") && (
        <div style={{ display: activeTab === "cashbook" ? "block" : "none" }}>
          <CashbookTab />
        </div>
      )}
    </div>
  );
}
