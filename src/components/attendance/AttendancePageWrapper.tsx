"use client";

import { useState } from "react";
import { Clock, Settings, Calendar } from "lucide-react";
import dynamic from "next/dynamic";
import type { AttendanceBootstrapData } from "@/lib/attendance-bootstrap-state";

const MyAttendanceTab = dynamic(() => import("./MyAttendanceTab"));
const ManagementTab = dynamic(() => import("./ManagementTab"));

interface Props {
  userId: string;
  userRole: string;
  userName: string;
  canViewAll: boolean;
  canEdit: boolean;
  initialMyTabData: AttendanceBootstrapData | null;
}

export default function AttendancePageWrapper({ userId, userRole, userName, canViewAll, canEdit, initialMyTabData }: Props) {
  const [activeTab, setActiveTab] = useState<"my" | "manage">("my");

  const tabs = [
    { key: "my" as const, label: "Chấm Công Của Tôi", icon: <Calendar size={15} />, color: "#2563EB" },
    ...(canViewAll ? [{ key: "manage" as const, label: "Quản Lý Chấm Công", icon: <Settings size={15} />, color: "#16a34a" }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "0" }}>
      <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", background: "#fff", paddingLeft: "4px", marginBottom: "16px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "10px 20px", fontSize: "13px",
              fontWeight: activeTab === t.key ? 700 : 500,
              color: activeTab === t.key ? t.color : "#6b7280",
              background: "transparent", border: "none",
              borderBottom: activeTab === t.key ? `2.5px solid ${t.color}` : "2.5px solid transparent",
                marginBottom: "-2px", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0,
              }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {activeTab === "my" && <MyAttendanceTab userId={userId} userName={userName} initialData={initialMyTabData} />}
        {activeTab === "manage" && canViewAll && <ManagementTab canEdit={canEdit} />}
      </div>
    </div>
  );
}
