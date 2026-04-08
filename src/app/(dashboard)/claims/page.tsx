import { getCachedSession } from "@/lib/cached-session";
import { redirect } from "next/navigation";
import ClaimsPageWrapper from "@/components/claims/ClaimsPageWrapper";
import { getClaimsBootstrapData } from "@/lib/claims-page-data";

interface ClaimsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ClaimsPage({ searchParams }: ClaimsPageProps) {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const resolvedSearchParams = await searchParams;
  const getParam = (key: string) => {
    const value = resolvedSearchParams[key];
    return typeof value === "string" ? value : "";
  };
  const activeTab = getParam("claimTab");
  const shouldPrefetchClaims = activeTab !== "tools" && activeTab !== "compensation";
  const initialBootstrap = shouldPrefetchClaims
    ? await getClaimsBootstrapData({
        page: Number(getParam("claimPage") || "1"),
        pageSize: 20,
        search: getParam("claimSearch"),
        issueType: getParam("claimIssueType").split(",").filter(Boolean),
        status: getParam("claimStatus"),
        shopName: getParam("claimShop"),
        orderStatus: getParam("claimOrderStatus"),
        showCompleted: getParam("claimCompleted") === "true",
        sortBy: getParam("claimSortBy") || "deadline",
        sortDir: getParam("claimSortDir") === "desc" ? "desc" : "asc",
      })
    : null;
  const canViewCompensation = user.role === "ADMIN" || user.role === "MANAGER" || !!user.permissions?.canViewCompensation || !!user.permissions?.canViewFinancePage;
  const canCreateClaim = !!user.permissions?.canCreateClaim || user.role === "ADMIN";
  const canUpdateClaim = !!user.permissions?.canUpdateClaim || user.role === "ADMIN";
  const canDeleteClaim = !!user.permissions?.canDeleteClaim || user.role === "ADMIN";

  return (
    <ClaimsPageWrapper
      userRole={user.role || "STAFF"}
      canViewCompensation={canViewCompensation}
      canCreateClaim={canCreateClaim}
      canUpdateClaim={canUpdateClaim}
      canDeleteClaim={canDeleteClaim}
      initialClaimsData={initialBootstrap?.list ?? null}
      initialFilterOptions={initialBootstrap?.filterOptions ?? null}
    />
  );
}
