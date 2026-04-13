import FinancePageClient from "@/components/finance/FinancePageClient";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinanceLandingData, resolvePnlRange } from "@/lib/finance/landing";
import { getFinanceAnalysisInitialData, getFinanceCashbookInitialData } from "@/lib/finance/page-data";
import { parsePeriodFromURL } from "@/lib/finance-period";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinancePage({ searchParams }: Props) {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");

  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const isAdmin = session.user.role === "ADMIN";
  const resolvedSearchParams = await searchParams;
  const activeTab = typeof resolvedSearchParams.tab === "string" ? resolvedSearchParams.tab : "overview";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  let initialLandingData = null;
  let initialAnalysisData = null;
  let initialCashbookData = null;
  if (activeTab === "overview") {
    const url = new URL("http://localhost/finance");
    for (const [key, value] of Object.entries(resolvedSearchParams)) {
      if (typeof value === "string") {
        url.searchParams.set(key, value);
      }
    }

    // Pre-fetch dữ liệu first paint cho tab Tổng quan để giảm waterfall client.
    initialLandingData = await getFinanceLandingData({
      overviewRange: parsePeriodFromURL(url),
      pnlRange: resolvePnlRange(
        typeof resolvedSearchParams.pnlFrom === "string" ? resolvedSearchParams.pnlFrom : null,
        typeof resolvedSearchParams.pnlTo === "string" ? resolvedSearchParams.pnlTo : null,
      ),
    });
  } else if (activeTab === "analysis") {
    initialAnalysisData = await getFinanceAnalysisInitialData(params);
  } else if (activeTab === "cashbook") {
    initialCashbookData = await getFinanceCashbookInitialData(params);
  }

  return (
    <FinancePageClient
      isAdmin={isAdmin}
      initialLandingData={initialLandingData}
      initialCategories={initialLandingData?.categories}
      initialAnalysisData={initialAnalysisData}
      initialCashbookData={initialCashbookData}
    />
  );
}
