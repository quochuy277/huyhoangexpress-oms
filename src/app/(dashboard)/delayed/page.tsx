import type { Metadata } from "next";
import { getCachedSession } from "@/lib/cached-session";
import { DelayedClient } from "@/components/delayed/DelayedClient";
import { getDelayedPageData } from "@/lib/delayed-page-data";
import type { ProcessedDelayedOrder } from "@/lib/delay-analyzer";

export const metadata: Metadata = {
  title: "Chăm Sóc Đơn Hoãn",
};

interface DelayedOrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DelayedOrdersPage({ searchParams }: DelayedOrdersPageProps) {
  const session = await getCachedSession();
  const userRole = session?.user?.role || "VIEWER";
  const resolvedSearchParams = await searchParams;
  const getParam = (key: string) => {
    const value = resolvedSearchParams[key];
    return typeof value === "string" ? value : "";
  };
  const initialData = await getDelayedPageData({
    page: Number(getParam("page") || "1"),
    pageSize: Number(getParam("pageSize") || "50"),
    search: getParam("search"),
    shopFilter: getParam("shop"),
    carrierFilter: getParam("carrier"),
    riskFilter: getParam("risk"),
    reasonFilter: getParam("reason"),
    delayCountFilter: getParam("delay"),
    statusFilter: getParam("status"),
    todayOnly: getParam("today") === "1",
    sortKey: (getParam("sortKey") || "delayCount") as keyof ProcessedDelayedOrder,
    sortDir: getParam("sortDir") === "asc" ? "asc" : "desc",
  });

  return <DelayedClient userRole={userRole} initialData={initialData} />;
}
