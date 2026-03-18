import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { PermissionSet } from "@/lib/permissions";

/**
 * Check finance API access: auth + canViewFinancePage permission.
 * Returns { session, error } — if error is set, return it immediately.
 */
export async function requireFinanceAccess() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 }) };
  }

  const permissions = session.user.permissions as PermissionSet | undefined;
  if (!permissions?.canViewFinancePage) {
    return { session: null, error: NextResponse.json({ error: "Không có quyền truy cập trang tài chính" }, { status: 403 }) };
  }

  return { session, error: null };
}
