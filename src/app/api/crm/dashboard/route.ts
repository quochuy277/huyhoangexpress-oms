import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCrmShopsInitialData } from "@/lib/crm-page-data";
import { hasPermission } from "@/lib/route-permissions";
import { createServerTiming, mergeServerTimingValues } from "@/lib/server-timing";
import { logger } from "@/lib/logger";


export async function GET() {
  const timing = createServerTiming();

  try {
    const session = await timing.measure("auth", () => auth());
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: timing.headers() });
    }

    if (!hasPermission(session.user, "canViewCRM")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: timing.headers() });
    }

    const initialData = await getCrmShopsInitialData(session.user);
    const headers = timing.headers();
    headers["Server-Timing"] = mergeServerTimingValues(headers["Server-Timing"], initialData._timing);
    timing.log("crm-dashboard-api");

    return NextResponse.json(initialData.dashboard, { headers });
  } catch (error) {
    logger.error("GET /api/crm/dashboard", "CRM Dashboard Error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: timing.headers() }
    );
  }
}
