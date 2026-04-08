import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardSummaryData } from "@/lib/dashboard-overview-data";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const responseData = await getDashboardSummaryData(session.user.role);

  return NextResponse.json(responseData, {
    headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" },
  });
}
