import FinancePageClient from "@/components/finance/FinancePageClient";
import { auth } from "@/lib/auth";
import { getFinanceLandingData, resolvePnlRange } from "@/lib/finance/landing";
import { parsePeriodFromURL } from "@/lib/finance-period";
import { redirect } from "next/navigation";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FinancePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, permissions } = session.user;
  if (!permissions?.canViewFinancePage && role !== "ADMIN") redirect("/");

  const isAdmin = role === "ADMIN";
  const resolvedSearchParams = await searchParams;
  const activeTab = typeof resolvedSearchParams.tab === "string" ? resolvedSearchParams.tab : "overview";

  let initialLandingData = null;
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
  }

  return (
    <FinancePageClient
      isAdmin={isAdmin}
      initialLandingData={initialLandingData}
      initialCategories={initialLandingData?.categories}
    />
  );
}
