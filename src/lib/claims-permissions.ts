import { NextResponse } from "next/server";

import type { Role } from "@prisma/client";

import type { PermissionSet } from "@/lib/permissions";

type ClaimsPermissionKey =
  | "canViewClaims"
  | "canCreateClaim"
  | "canUpdateClaim"
  | "canDeleteClaim"
  | "canViewCompensation";

type ClaimsUser = {
  role?: Role | string | null;
  permissions?: PermissionSet | null;
} | null | undefined;

export function hasClaimsPermission(user: ClaimsUser, key: ClaimsPermissionKey) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return Boolean(user.permissions?.[key]);
}

export function requireClaimsPermission(user: ClaimsUser, key: ClaimsPermissionKey) {
  if (hasClaimsPermission(user, key)) {
    return null;
  }

  return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
}
