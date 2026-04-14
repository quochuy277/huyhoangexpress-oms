import { getCachedSession } from "@/lib/cached-session";
import { ReturnsPageClient } from "@/components/returns/ReturnsPageClient";
import { getReturnsSummaryData, getReturnsTabData } from "@/lib/returns-page-data";
import {
  createReturnsTabDataWithInitial,
  DEFAULT_RETURNS_PAGE_SIZE,
  resolveReturnsTabPage,
  type ReturnsTabKey,
} from "@/lib/returns-tab-data";
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
  const initialUrlSearchParams = new URLSearchParams(
    Object.entries(resolvedSearchParams).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );

  const [initialSummaryCounts, initialRows] = await Promise.all([
    getReturnsSummaryData(),
    getReturnsTabData({
      tab: initialActiveTab,
      search: initialFilters.search,
      shopFilter: initialFilters.shopName,
      daysRange: initialFilters.daysRange,
      hasNotes: initialFilters.hasNotes,
      confirmAsked: initialFilters.confirmAsked,
      page: resolveReturnsTabPage(initialUrlSearchParams, initialActiveTab),
      pageSize: DEFAULT_RETURNS_PAGE_SIZE,
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
