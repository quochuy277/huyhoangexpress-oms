import { getCachedSession } from "@/lib/cached-session";
import { ReturnsPageClient } from "@/components/returns/ReturnsPageClient";
import { getReturnsSummaryData, getReturnsTabData } from "@/lib/returns-page-data";
import { createReturnsTabDataWithInitial, type ReturnsTabKey } from "@/lib/returns-tab-data";
import type { ReturnFilters } from "@/components/returns/ReturnFilterPanel";

const VALID_TABS: ReturnsTabKey[] = ["partial", "full", "warehouse"];

interface ReturnsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReturnsPage({ searchParams }: ReturnsPageProps) {
  await getCachedSession();

  const resolvedSearchParams = await searchParams;
  const getParam = (key: string) => {
    const value = resolvedSearchParams[key];
    return typeof value === "string" ? value : "";
  };

  const initialActiveTab: ReturnsTabKey = VALID_TABS.includes(getParam("tab") as ReturnsTabKey)
    ? (getParam("tab") as ReturnsTabKey)
    : "partial";

  const initialFilters: ReturnFilters = {
    search: getParam("search"),
    shopName: getParam("shop"),
    daysRange: getParam("days"),
    hasNotes: getParam("notes"),
    confirmAsked: getParam("confirm"),
  };

  const [initialSummaryCounts, initialRows] = await Promise.all([
    getReturnsSummaryData(),
    getReturnsTabData({
      tab: initialActiveTab,
      search: initialFilters.search,
      page: 1,
      pageSize: 50,
    }),
  ]);

  return (
    <ReturnsPageClient
      initialActiveTab={initialActiveTab}
      initialTabData={createReturnsTabDataWithInitial(initialActiveTab, initialRows)}
      initialSummaryCounts={initialSummaryCounts}
      initialFilters={initialFilters}
    />
  );
}
