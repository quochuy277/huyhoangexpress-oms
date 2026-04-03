import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

import type { PermissionSet } from "@/lib/permissions";

type PermissionUser = {
  role?: Role | string | null;
  permissions?: Partial<PermissionSet> | null;
} | null | undefined;

export function hasPermission(user: PermissionUser, key: keyof PermissionSet) {
  if (!user) {
    return false;
  }

  if (user.role === "ADMIN") {
    return true;
  }

  return Boolean(user.permissions?.[key]);
}

export function requirePermission(
  user: PermissionUser,
  key: keyof PermissionSet,
  errorMessage = "Không có quyền",
) {
  if (hasPermission(user, key)) {
    return null;
  }

  return NextResponse.json({ error: errorMessage }, { status: 403 });
}
