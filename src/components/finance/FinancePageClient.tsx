"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";

import type { FinanceCategoryOption, FinanceLandingData } from "@/lib/finance/landing";

const OverviewTab = dynamic(() => import("./OverviewTab"), {
  loading: () => (
    <div className="flex h-96 items-center justify-center text-slate-400">Đang tải...</div>
  ),
});
const AnalysisTab = dynamic(() => import("./AnalysisTab"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center text-slate-400">Đang tải...</div>
  ),
});
const CashbookTab = dynamic(() => import("./CashbookTab"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center text-slate-400">Đang tải...</div>
  ),
});

const TABS = [
  { id: "overview", label: "Tổng quan & P&L" },
  { id: "analysis", label: "Phân tích" },
  { id: "cashbook", label: "Sổ quỹ" },
];

interface Props {
  isAdmin: boolean;
  initialLandingData?: FinanceLandingData | null;
  initialCategories?: FinanceCategoryOption[];
}

export default function FinancePageClient({
  isAdmin,
  initialLandingData,
  initialCategories,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(tabParam);
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set([tabParam]));

  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  const switchTab = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      setMountedTabs((prev) => {
        if (prev.has(tab)) return prev;
        const next = new Set(prev);
        next.add(tab);
        return next;
      });

      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(`/finance?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="mb-4 sm:mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">💰 Tài chính</h1>
        <p className="mt-1 text-sm text-slate-500">
          Theo dõi tổng quan tài chính, phân tích hiệu quả và đối soát sổ quỹ.
        </p>
      </div>

      <div className="mb-5 overflow-x-auto border-b border-slate-200 pb-1 sm:mb-6">
        <div className="flex min-w-max gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {mountedTabs.has("overview") && (
        <div style={{ display: activeTab === "overview" ? "block" : "none" }}>
          <OverviewTab
            isAdmin={isAdmin}
            initialLandingData={initialLandingData}
            initialCategories={initialCategories}
          />
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
