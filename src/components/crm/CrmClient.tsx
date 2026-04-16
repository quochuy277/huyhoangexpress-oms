"use client";

import { useSearchParams, usePathname } from "next/navigation";
import { Users, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShopManagementTab } from "./ShopManagementTab";
import dynamic from "next/dynamic";
import { buildCrmTabHref, getCrmTab, type CrmTabKey } from "./crm-tabs";

const ProspectPipelineTab = dynamic(() => import("./ProspectPipelineTab").then(m => ({ default: m.ProspectPipelineTab })), { loading: () => <div className="h-96 flex items-center justify-center text-slate-400">Đang tải...</div> });

interface CrmClientProps {
  userRole: string;
  userId: string;
  userName: string;
  canManageCRM: boolean;
  canEditShopInfo: boolean;
  initialProspectsData?: unknown;
  initialShopsData?: unknown;
}

const TABS = [
  { key: "shops", label: "Quản lý Shop", icon: Users },
  { key: "prospects", label: "Shop Tiềm Năng", icon: Target },
] as const;

export function CrmClient({ userRole, userId, userName, canManageCRM, canEditShopInfo, initialProspectsData, initialShopsData }: CrmClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const currentTab = getCrmTab(searchParams.get("tab"));

  const setTab = (tab: CrmTabKey) => {
    if (tab === currentTab) return;

    window.history.replaceState(null, "", buildCrmTabHref(pathname, searchParams.toString(), tab));
  };

  return (
    <div className="flex-1 space-y-4 pt-2 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            Quản Lý Khách Hàng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý shop, chăm sóc khách hàng và theo dõi pipeline bán hàng.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all",
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {currentTab === "shops" && (
        <ShopManagementTab
          userRole={userRole}
          userId={userId}
          userName={userName}
          canManageCRM={canManageCRM}
          canEditShopInfo={canEditShopInfo}
          initialData={initialShopsData}
        />
      )}
      {currentTab === "prospects" && (
        <ProspectPipelineTab
          userRole={userRole}
          userId={userId}
          userName={userName}
          initialData={initialProspectsData}
        />
      )}
    </div>
  );
}
