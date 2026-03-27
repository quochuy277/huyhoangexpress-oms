import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClaimsPageWrapper from "@/components/claims/ClaimsPageWrapper";

export default async function ClaimsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const canViewCompensation = user.role === "ADMIN" || user.role === "MANAGER" || !!user.permissions?.canViewCompensation || !!user.permissions?.canViewFinancePage;

  return (
    <ClaimsPageWrapper
      userRole={user.role || "STAFF"}
      canViewCompensation={canViewCompensation}
    />
  );
}
