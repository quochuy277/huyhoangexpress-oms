"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import OverviewTab from "./OverviewTab";
import AnalysisTab from "./AnalysisTab";
import CashbookTab from "./CashbookTab";

const TABS = [
  { id: "overview", label: "Tổng quan & P&L" },
  { id: "analysis", label: "Phân tích" },
  { id: "cashbook", label: "Sổ quỹ" },
];

interface Props { isAdmin: boolean; }

export default function FinancePageClient({ isAdmin }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => { setActiveTab(tabParam); }, [tabParam]);

  const switchTab = useCallback((tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/finance?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  return (
    <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, color: "#1e293b" }}>💰 Tài Chính</h1>
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #e2e8f0" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)} style={{
            padding: "10px 20px", fontWeight: 600, fontSize: 14, border: "none", cursor: "pointer",
            borderBottom: activeTab === t.id ? "3px solid #2563eb" : "3px solid transparent",
            color: activeTab === t.id ? "#2563eb" : "#64748b",
            background: activeTab === t.id ? "#eff6ff" : "transparent",
            borderRadius: "8px 8px 0 0", transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>
      {activeTab === "overview" && <OverviewTab isAdmin={isAdmin} />}
      {activeTab === "analysis" && <AnalysisTab />}
      {activeTab === "cashbook" && <CashbookTab />}
    </div>
  );
}
