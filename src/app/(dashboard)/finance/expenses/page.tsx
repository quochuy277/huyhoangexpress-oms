// src/app/(dashboard)/finance/expenses/page.tsx
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinanceLandingCategories, getFinanceBudgetSummary } from "@/lib/finance/landing";
import ExpensesPageClient from "@/components/finance/expenses/ExpensesPageClient";

export default async function FinanceExpensesPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const isAdmin = session.user.role === "ADMIN";
  const categories = await getFinanceLandingCategories();
  const budgets = await getFinanceBudgetSummary(format(new Date(), "yyyy-MM"), categories);

  return <ExpensesPageClient isAdmin={isAdmin} initialCategories={categories} initialBudgets={budgets} />;
}
