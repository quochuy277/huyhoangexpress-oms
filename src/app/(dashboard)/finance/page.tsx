// src/app/(dashboard)/finance/page.tsx
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinanceLandingData, resolvePnlRange, getCurrentMonthRange } from "@/lib/finance/landing";
import DashboardPageClient from "@/components/finance/dashboard/DashboardPageClient";

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>>; }

export default async function FinancePage({ searchParams }: Props) {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const resolved = await searchParams;

  // Backward-compat: legacy /finance?tab=... links
  const tab = typeof resolved.tab === "string" ? resolved.tab : null;
  if (tab === "analysis") redirect("/finance/analysis");
  if (tab === "cashbook") redirect("/finance/cashbook");
  // tab "overview" (or missing) → stay on the dashboard

  const initialData = await getFinanceLandingData({
    overviewRange: getCurrentMonthRange(),
    pnlRange: resolvePnlRange(null, null),
  });

  return <DashboardPageClient initialData={initialData} />;
}
