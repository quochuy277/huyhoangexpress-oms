// src/app/(dashboard)/finance/pnl/page.tsx
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinancePnlData, getCurrentMonthRange, buildPnlLabel } from "@/lib/finance/landing";
import { getPreviousRange } from "@/lib/finance/compare";
import { getFinanceTargets } from "@/lib/finance/targets";
import PnlPageClient from "@/components/finance/pnl/PnlPageClient";

export default async function FinancePnlPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const isAdmin = session.user.role === "ADMIN";
  const range = getCurrentMonthRange();
  const prev = getPreviousRange(range);
  const [current, previous, targets] = await Promise.all([
    getFinancePnlData(range, buildPnlLabel(range.from, range.to)),
    getFinancePnlData(prev, buildPnlLabel(prev.from, prev.to)),
    getFinanceTargets(format(range.from, "yyyy-MM")),
  ]);

  return <PnlPageClient isAdmin={isAdmin} initialCompare={{ current, previous }} initialTargets={targets} />;
}
