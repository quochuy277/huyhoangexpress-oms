import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardSummaryData } from "@/lib/dashboard-overview-data";
import { requirePermission } from "@/lib/route-permissions";
import { createServerTiming } from "@/lib/server-timing";

export async function GET() {
  const timing = createServerTiming();

  const session = await timing.measure("auth", () => auth());
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const denied = requirePermission(session.user, "canViewDashboard", "Không có quyền xem tổng quan");
  if (denied) return denied;

  const responseData = await timing.measure("data", () => getDashboardSummaryData(session.user.role));

  timing.log("dashboard-summary");

  return NextResponse.json(responseData, {
    headers: {
      "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
      "Server-Timing": timing.headerValue(),
    },
  });
}
