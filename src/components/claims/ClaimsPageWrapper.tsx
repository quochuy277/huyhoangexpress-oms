"use client";

import ClaimsClient from "@/components/claims/ClaimsClient";
import { useState } from "react";
import { AlertTriangle, Wrench, DollarSign } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const ClaimsToolsTab = dynamic(() => import("@/components/claims/ClaimsToolsTab"));
const ClaimsCompensationTab = dynamic(() => import("@/components/claims/ClaimsCompensationTab"));

type TabKey = "claims" | "tools" | "compensation";

interface Props {
  userRole: string;
  canViewCompensation: boolean;
  canCreateClaim: boolean;
  canUpdateClaim: boolean;
  canDeleteClaim: boolean;
  initialClaimsData?: {
    claims?: any[];
    pagination?: {
      total?: number;
      totalPages?: number;
    };
  } | null;
  initialFilterOptions?: {
    shops?: string[];
    statuses?: string[];
  } | null;
}

export default function ClaimsPageWrapper({
  userRole,
  canViewCompensation,
  canCreateClaim,
  canUpdateClaim,
  canDeleteClaim,
  initialClaimsData,
  initialFilterOptions,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchTab = searchParams.get("claimTab");
  const initialTab = searchTab === "tools" || searchTab === "compensation" ? searchTab : "claims";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [claimCount, setClaimCount] = useState(0);
  const [externalDetailClaimId, setExternalDetailClaimId] = useState<string | null>(null);
  // Lazy mount: chỉ mount tab khi user mở lần đầu, sau đó giữ mounted để tránh re-fetch
  const [mountedTabs, setMountedTabs] = useState<Set<TabKey>>(new Set(["claims", initialTab as TabKey]));

  const isAdmin = userRole === "ADMIN";

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    const params = new URLSearchParams(searchParams.toString());
    if (key === "claims") {
      params.delete("claimTab");
    } else {
      params.set("claimTab", key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setMountedTabs(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  // claimCount is now updated via onCountChange callback from ClaimsClient - no separate fetch needed

  const tabs = [
    { key: "claims" as TabKey, label: `Đơn có vấn đề (${claimCount})`, icon: <AlertTriangle size={15} />, color: "#dc2626" },
    { key: "tools" as TabKey, label: "Công cụ", icon: <Wrench size={15} />, color: "#2563EB" },
    ...(canViewCompensation ? [{ key: "compensation" as TabKey, label: "Tổng hợp đền bù", icon: <DollarSign size={15} />, color: "#16a34a" }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0" }}>
      {/* Tab Bar */}
      <div style={{
        display: "flex", borderBottom: "2px solid #e5e7eb",
        background: "#fff", paddingLeft: "4px", marginBottom: "12px",
        overflowX: "auto", WebkitOverflowScrolling: "touch",
      }} role="tablist" aria-label="Claims tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            role="tab"
            aria-selected={activeTab === t.key}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "10px 14px", fontSize: "13px",
              fontWeight: activeTab === t.key ? 700 : 500,
              color: activeTab === t.key ? t.color : "#6b7280",
              background: "transparent", border: "none",
              borderBottom: activeTab === t.key ? `2.5px solid ${t.color}` : "2.5px solid transparent",
              marginBottom: "-2px", cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content — lazy mount lần đầu, sau đó giữ mounted + CSS hide để tránh re-fetch */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {mountedTabs.has("claims") && (
          <div style={{ display: activeTab === "claims" ? "block" : "none", height: "100%" }}>
            <ClaimsClient
              onCountChange={setClaimCount}
              externalDetailClaimId={externalDetailClaimId}
              onExternalDetailConsumed={() => setExternalDetailClaimId(null)}
              canCreateClaim={canCreateClaim}
              canUpdateClaim={canUpdateClaim}
              canDeleteClaim={canDeleteClaim}
              initialClaimsData={initialClaimsData}
              initialFilterOptions={initialFilterOptions}
            />
          </div>
        )}
        {mountedTabs.has("tools") && (
          <div style={{ display: activeTab === "tools" ? "block" : "none", height: "100%" }}>
            <ClaimsToolsTab
              isAdmin={isAdmin}
              onOpenClaim={(claimId) => {
                setExternalDetailClaimId(claimId);
              }}
            />
          </div>
        )}
        {canViewCompensation && mountedTabs.has("compensation") && (
          <div style={{ display: activeTab === "compensation" ? "block" : "none", height: "100%" }}>
            <ClaimsCompensationTab />
          </div>
        )}
      </div>
    </div>
  );
}
