import { getCachedSession } from "@/lib/cached-session";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/route-permissions";

import ClaimsPageWrapper from "@/components/claims/ClaimsPageWrapper";

export default async function ClaimsPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const canViewCompensation = hasPermission(user, "canViewCompensation") || hasPermission(user, "canViewFinancePage");
  const canCreateClaim = hasPermission(user, "canCreateClaim");
  const canUpdateClaim = hasPermission(user, "canUpdateClaim");
  const canDeleteClaim = hasPermission(user, "canDeleteClaim");
  const canViewClaimsTools = hasPermission(user, "canViewClaimsTools");
  const canManageDocuments = hasPermission(user, "canManageDocuments");
  const canManageLinks = hasPermission(user, "canManageLinks");

  return (
    <ClaimsPageWrapper
      userRole={user.role || "STAFF"}
      canViewCompensation={canViewCompensation}
      canCreateClaim={canCreateClaim}
      canUpdateClaim={canUpdateClaim}
      canDeleteClaim={canDeleteClaim}
      canViewClaimsTools={canViewClaimsTools}
      canManageDocuments={canManageDocuments}
      canManageLinks={canManageLinks}
    />
  );
}
