import { getCachedSession } from "@/lib/cached-session";
import { CrmClient } from "@/components/crm/CrmClient";
import { getCrmProspectsInitialData, getCrmShopsInitialData } from "@/lib/crm-page-data";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Quản Lý Khách Hàng | Care Đơn" };

interface CrmPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CrmPage({ searchParams }: CrmPageProps) {
  const session = await getCachedSession();
  const userRole = session?.user?.role || "VIEWER";
  const userId = session?.user?.id || "";
  const userName = session?.user?.name || "";
  const resolvedSearchParams = await searchParams;
  const activeTab = typeof resolvedSearchParams.tab === "string" ? resolvedSearchParams.tab : "shops";
  const crmUser = {
    id: userId,
    role: userRole,
    permissions: session?.user?.permissions,
  };

  const initialProspectsData = activeTab === "prospects" ? await getCrmProspectsInitialData(crmUser) : null;
  const initialShopsData = activeTab === "shops" ? await getCrmShopsInitialData(crmUser) : null;

  return (
    <CrmClient
      userRole={userRole}
      userId={userId}
      userName={userName}
      initialProspectsData={initialProspectsData}
      initialShopsData={initialShopsData}
    />
  );
}
