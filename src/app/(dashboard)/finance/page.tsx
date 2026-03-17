import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import FinancePageClient from "@/components/finance/FinancePageClient";

export default async function FinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, permissions } = session.user as any;
  if (!permissions?.canViewFinancePage && role !== "ADMIN") redirect("/");

  const isAdmin = role === "ADMIN";

  return <FinancePageClient isAdmin={isAdmin} />;
}
