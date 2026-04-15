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
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a" }}>Quản Lý Nhân Viên</h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>Quản lý nhân viên, phân quyền, thông báo và góp ý</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "#f3f4f6", borderRadius: "8px", padding: "4px", width: "fit-content", flexWrap: "wrap" }}>
        <TabButton active={activeTab === "users"} icon={Users} label={`Nhân viên`} onClick={() => setActiveTab("users")} />
        <TabButton active={activeTab === "permissions"} icon={Shield} label={`Nhóm quyền`} onClick={() => setActiveTab("permissions")} />
        <TabButton active={activeTab === "announcements"} icon={Megaphone} label={`Thông báo`} onClick={() => setActiveTab("announcements")} />
        <TabButton active={activeTab === "requests"} icon={FileText} label={`Yêu cầu & Góp ý`} onClick={() => setActiveTab("requests")} />
      </div>

      {activeTab === "users" && <UsersTab />}
      {activeTab === "permissions" && <PermissionsTab />}
      {activeTab === "announcements" && <AnnouncementSection />}
      {activeTab === "requests" && <RequestsFeedbackTab />}
    </div>
  );
}
