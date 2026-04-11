import { getCachedSession } from "@/lib/cached-session";
import { redirect } from "next/navigation";

import ClaimsPageWrapper from "@/components/claims/ClaimsPageWrapper";

export default async function ClaimsPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const canViewCompensation = user.role === "ADMIN" || user.role === "MANAGER" || !!user.permissions?.canViewCompensation || !!user.permissions?.canViewFinancePage;
  const canCreateClaim = !!user.permissions?.canCreateClaim || user.role === "ADMIN";
  const canUpdateClaim = !!user.permissions?.canUpdateClaim || user.role === "ADMIN";
  const canDeleteClaim = !!user.permissions?.canDeleteClaim || user.role === "ADMIN";
  const canViewClaimsTools = !!user.permissions?.canViewClaimsTools || user.role === "ADMIN";
  const canManageDocuments = !!user.permissions?.canManageDocuments || user.role === "ADMIN";
  const canManageLinks = !!user.permissions?.canManageLinks || user.role === "ADMIN";

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
