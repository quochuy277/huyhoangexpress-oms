"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Users, Shield, Megaphone, FileText } from "lucide-react";
import UsersTab from "@/components/admin/UsersTab";
import PermissionsTab from "@/components/admin/PermissionsTab";
import { AnnouncementSection } from "@/components/shared/AnnouncementSection";

/* Lazy-load rarely-used tabs */
const RequestsFeedbackTab = dynamic(() => import("@/components/admin/RequestsFeedbackTab"), { ssr: false });

type TabId = "users" | "permissions" | "announcements" | "requests";

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "8px",
        fontSize: "13px", fontWeight: 500, border: "none", cursor: "pointer", transition: "all 0.2s",
        background: active ? "#FFFFFF" : "transparent",
        color: active ? "#2563EB" : "#6b7280",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<TabId>("users");

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a" }}>Qu{"\u1EA3"}n L{"\u00FD"} Nh{"\u00E2"}n Vi{"\u00EA"}n</h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>Qu{"\u1EA3"}n l{"\u00FD"} nh{"\u00E2"}n vi{"\u00EA"}n, ph{"\u00E2"}n quy{"\u1EC1"}n, th{"\u00F4"}ng b{"\u00E1"}o v{"\u00E0"} g{"\u00F3"}p {"\u00FD"}</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "#f3f4f6", borderRadius: "8px", padding: "4px", width: "fit-content", flexWrap: "wrap" }}>
        <TabButton active={activeTab === "users"} icon={Users} label={`Nh\u00E2n vi\u00EAn`} onClick={() => setActiveTab("users")} />
        <TabButton active={activeTab === "permissions"} icon={Shield} label={`Nh\u00F3m quy\u1EC1n`} onClick={() => setActiveTab("permissions")} />
        <TabButton active={activeTab === "announcements"} icon={Megaphone} label={`Th\u00F4ng b\u00E1o`} onClick={() => setActiveTab("announcements")} />
        <TabButton active={activeTab === "requests"} icon={FileText} label={`Y\u00EAu c\u1EA7u & G\u00F3p \u00FD`} onClick={() => setActiveTab("requests")} />
      </div>

      {activeTab === "users" && <UsersTab />}
      {activeTab === "permissions" && <PermissionsTab />}
      {activeTab === "announcements" && <AnnouncementSection />}
      {activeTab === "requests" && <RequestsFeedbackTab />}
    </div>
  );
}
