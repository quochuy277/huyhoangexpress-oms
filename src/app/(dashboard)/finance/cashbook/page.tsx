import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinanceCashbookInitialData } from "@/lib/finance/page-data";
import CashbookPageClient from "@/components/finance/cashbook/CashbookPageClient";

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>>; }

export default async function FinanceCashbookPage({ searchParams }: Props) {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(resolved)) if (typeof v === "string") params.set(k, v);

  const initialData = await getFinanceCashbookInitialData(params);
  return <CashbookPageClient initialData={initialData} />;
}
