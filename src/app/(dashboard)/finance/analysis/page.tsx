// src/app/(dashboard)/finance/analysis/page.tsx
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { getFinanceAnalysisInitialData } from "@/lib/finance/page-data";

const AnalysisTab = dynamic(() => import("@/components/finance/AnalysisTab"));

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>>; }

export default async function FinanceAnalysisPage({ searchParams }: Props) {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user, "canViewFinancePage")) redirect("/no-access");

  const resolved = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(resolved)) if (typeof v === "string") params.set(k, v);

  const initialData = await getFinanceAnalysisInitialData(params);
  return (
    <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">📈 Phân tích</h1>
        <p className="mt-1 text-sm text-slate-500">So sánh đối tác, xếp hạng cửa hàng, đơn doanh thu âm.</p>
      </div>
      <AnalysisTab initialData={initialData} />
    </div>
  );
}
