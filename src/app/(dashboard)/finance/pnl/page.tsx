// src/app/(dashboard)/finance/pnl/page.tsx
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinancePnlData, getCurrentMonthRange } from "@/lib/finance/landing";
import PnlPageClient from "@/components/finance/pnl/PnlPageClient";

export default async function FinancePnlPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const initialPnl = await getFinancePnlData(getCurrentMonthRange());
  return <PnlPageClient initialPnl={initialPnl} />;
}
