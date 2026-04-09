import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getCachedClaimsFilterOptionsData } from "@/lib/claims-filter-options-cache";
import { requireClaimsPermission } from "@/lib/claims-permissions";

function createServerTimingHeader(metricName: string, durationMs: number) {
  return `${metricName};dur=${durationMs.toFixed(1)}`;
}

export async function GET() {
  const startedAt = performance.now();

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const denied = requireClaimsPermission(session.user, "canViewClaims");
    if (denied) {
      return denied;
    }

    const data = await getCachedClaimsFilterOptionsData();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        "Server-Timing": createServerTimingHeader("claims-filters", performance.now() - startedAt),
      },
    });
  } catch (error) {
    console.error("GET /api/claims/filter-options error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
