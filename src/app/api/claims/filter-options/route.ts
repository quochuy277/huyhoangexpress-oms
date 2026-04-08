import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getClaimsFilterOptionsData } from "@/lib/claims-page-data";
import { requireClaimsPermission } from "@/lib/claims-permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const denied = requireClaimsPermission(session.user, "canViewClaims");
    if (denied) {
      return denied;
    }

    return NextResponse.json(await getClaimsFilterOptionsData());
  } catch (error) {
    console.error("GET /api/claims/filter-options error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống" }, { status: 500 });
  }
}
