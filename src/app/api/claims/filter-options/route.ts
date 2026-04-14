import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getCachedClaimsFilterOptionsData } from "@/lib/claims-filter-options-cache";
import { requireClaimsPermission } from "@/lib/claims-permissions";
import { logger } from "@/lib/logger";
import { createServerTiming } from "@/lib/server-timing";

export async function GET() {
  const timing = createServerTiming();

  try {
    const session = await timing.measure("auth", () => auth());
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401, headers: timing.headers() });
    }
    const denied = requireClaimsPermission(session.user, "canViewClaims");
    if (denied) {
      return denied;
    }

    const data = await timing.measure("claims_filters", () => getCachedClaimsFilterOptionsData());

    timing.log("claims-filter-options-api");

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        ...timing.headers(),
      },
    });
  } catch (error) {
    logger.error("GET /api/claims/filter-options", "Error", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500, headers: timing.headers() });
  }
}
