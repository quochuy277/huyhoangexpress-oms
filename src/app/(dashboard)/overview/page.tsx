import { Metadata } from "next";
import { getCachedSession } from "@/lib/cached-session";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { AlertCardsRow } from "@/components/dashboard/AlertCardsRow";
import { FinanceCardsRow } from "@/components/dashboard/FinanceCardsRow";
import { ActivityAndRatesRow } from "@/components/dashboard/ActivityAndRatesRow";
import dynamic from "next/dynamic";
import { getDashboardSummaryData } from "@/lib/dashboard-overview-data";

const TrendAndStatusRow = dynamic(() => import("@/components/dashboard/TrendAndStatusRow").then(m => ({ default: m.TrendAndStatusRow })), {
  loading: () => <div className="h-64 animate-pulse bg-muted rounded" />,
});
const CarrierAndShopsRow = dynamic(() => import("@/components/dashboard/CarrierAndShopsRow").then(m => ({ default: m.CarrierAndShopsRow })), {
  loading: () => <div className="h-64 animate-pulse bg-muted rounded" />,
});

export const metadata: Metadata = {
  title: "Tổng quan | Care Đơn",
  description: "Bảng tổng quan số liệu hệ thống Care Đơn",
};

export default async function DashboardPage() {
  const session = await getCachedSession();
  const userName = session?.user?.name || "Bạn";
  const userRole = session?.user?.role || "VIEWER";
  const initialSummaryData = await getDashboardSummaryData(userRole);

  const currentDate = new Date();
  const formattedDate = format(currentDate, "EEEE, dd/MM/yyyy", { locale: vi });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
      {/* Header Line */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tổng quan</h1>
          <p className="text-sm text-slate-500 mt-1 capitalize">
            Chào {userName} — <span className="font-medium text-slate-600">Hôm nay, {formattedDate}</span>
          </p>
        </div>
      </div>

      {/* Row 1: Alert Cards (All Roles) */}
      <AlertCardsRow initialSummaryData={initialSummaryData} />

      {/* Row 2: Financial Cards (Manager/Admin Only) */}
        {(userRole === "ADMIN" || userRole === "MANAGER") && (
        <FinanceCardsRow initialSummaryData={initialSummaryData} />
      )}

      {/* Row 3: Charts - Trend & Status (All Roles) */}
      <TrendAndStatusRow />

      {/* Row 4: Charts - Carriers & Shops (All Roles) */}
      <CarrierAndShopsRow />

      {/* Row 5: Activity Feed & Rates (All Roles) */}
      <ActivityAndRatesRow initialSummaryData={initialSummaryData} />
    </div>
  );
}
