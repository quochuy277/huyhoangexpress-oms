"use client";

import { useState } from "react";
import { AlertTriangle, DollarSign, Wrench } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function ClaimsTabSkeleton() {
  return (
    <div
      aria-busy="true"
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <div
        style={{
          border: "1px solid #dbeafe",
          background: "#eff6ff",
          color: "#1d4ed8",
          borderRadius: "10px",
          padding: "10px 12px",
          fontSize: "13px",
          lineHeight: "1.5",
        }}
      >
        Đang chuẩn bị danh sách đơn có vấn đề...
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ width: "220px", height: "40px", borderRadius: "10px", background: "#e2e8f0" }} />
        <div style={{ width: "140px", height: "40px", borderRadius: "10px", background: "#e2e8f0" }} />
        <div style={{ width: "140px", height: "40px", borderRadius: "10px", background: "#e2e8f0" }} />
      </div>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {[0, 1, 2, 3, 4].map((row) => (
          <div
            key={row}
            style={{
              height: "56px",
              borderBottom: row === 4 ? "none" : "1px solid #f1f5f9",
              background: row % 2 === 0 ? "#fff" : "#f8fafc",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const ClaimsClient = dynamic(
  () => import("@/components/claims/ClaimsClient"),
  {
    ssr: false,
    loading: () => <ClaimsTabSkeleton />,
  },
);

const ClaimsToolsTab = dynamic(
  () => import("@/components/claims/ClaimsToolsTab"),
  { loading: () => <ClaimsTabSkeleton /> },
);
const ClaimsCompensationTab = dynamic(
  () => import("@/components/claims/ClaimsCompensationTab"),
  { loading: () => <ClaimsTabSkeleton /> },
);

type TabKey = "claims" | "tools" | "compensation";

interface Props {
  userRole: string;
  canViewCompensation: boolean;
  canCreateClaim: boolean;
  canUpdateClaim: boolean;
  canDeleteClaim: boolean;
  canViewClaimsTools: boolean;
  canManageDocuments: boolean;
  canManageLinks: boolean;
}

export default function ClaimsPageWrapper({
  userRole,
  canViewCompensation,
  canCreateClaim,
  canUpdateClaim,
  canDeleteClaim,
  canViewClaimsTools,
  canManageDocuments,
  canManageLinks,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchTab = searchParams.get("claimTab");
  const initialTab = searchTab === "tools" || searchTab === "compensation" ? searchTab : "claims";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [claimCount, setClaimCount] = useState(0);
  const [externalDetailClaimId, setExternalDetailClaimId] = useState<string | null>(null);
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
    setMountedTabs((previousTabs) => {
      if (previousTabs.has(key)) return previousTabs;
      const nextTabs = new Set(previousTabs);
      nextTabs.add(key);
      return nextTabs;
    });
  };

  const tabs = [
    { key: "claims" as TabKey, label: `Đơn có vấn đề (${claimCount})`, icon: <AlertTriangle size={15} />, color: "#dc2626" },
    ...(canViewClaimsTools
      ? [{ key: "tools" as TabKey, label: "Công cụ", icon: <Wrench size={15} />, color: "#2563EB" }]
      : []),
    ...(canViewCompensation
      ? [{ key: "compensation" as TabKey, label: "Tổng hợp đền bù", icon: <DollarSign size={15} />, color: "#16a34a" }]
      : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0" }}>
      <div style={{
        display: "flex", borderBottom: "2px solid #e5e7eb",
        background: "#fff", paddingLeft: "4px", marginBottom: "12px",
        overflowX: "auto", WebkitOverflowScrolling: "touch",
      }} role="tablist" aria-label="Các tab đơn có vấn đề">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "10px 14px", fontSize: "13px",
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? tab.color : "#6b7280",
              background: "transparent", border: "none",
              borderBottom: activeTab === tab.key ? `2.5px solid ${tab.color}` : "2.5px solid transparent",
              marginBottom: "-2px", cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

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
            />
          </div>
        )}
        {canViewClaimsTools && mountedTabs.has("tools") && (
          <div style={{ display: activeTab === "tools" ? "block" : "none", height: "100%" }}>
            <ClaimsToolsTab
              isAdmin={isAdmin}
              canManageDocuments={canManageDocuments}
              canManageLinks={canManageLinks}
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
