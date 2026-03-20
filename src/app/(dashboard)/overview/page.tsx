import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { AlertCardsRow } from "@/components/dashboard/AlertCardsRow";
import { FinanceCardsRow } from "@/components/dashboard/FinanceCardsRow";
import { TrendAndStatusRow } from "@/components/dashboard/TrendAndStatusRow";
import { CarrierAndShopsRow } from "@/components/dashboard/CarrierAndShopsRow";
import { ActivityAndRatesRow } from "@/components/dashboard/ActivityAndRatesRow";

export const metadata: Metadata = {
  title: "Tổng quan | Care Đơn",
  description: "Bảng tổng quan số liệu hệ thống Care Đơn",
};

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || "Bạn";
  const userRole = session?.user?.role || "VIEWER";

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
      <AlertCardsRow />

      {/* Row 2: Financial Cards (Manager/Admin Only) */}
      {(userRole === "ADMIN" || userRole === "MANAGER") && (
        <FinanceCardsRow />
      )}

      {/* Row 3: Charts - Trend & Status (All Roles) */}
      <TrendAndStatusRow />

      {/* Row 4: Charts - Carriers & Shops (All Roles) */}
      <CarrierAndShopsRow />

      {/* Row 5: Activity Feed & Rates (All Roles) */}
      <ActivityAndRatesRow />
    </div>
  );
}
