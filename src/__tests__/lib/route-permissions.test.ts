import { describe, it, expect } from "vitest";

import { getDefaultPermissions, PERMISSION_KEYS } from "@/lib/permissions";
import { hasPermission, requirePermission } from "@/lib/route-permissions";

// ============================================================
// hasPermission — RBAC matrix
// ============================================================
describe("hasPermission", () => {
  it("returns false for null/undefined user", () => {
    expect(hasPermission(null, "canViewOrders")).toBe(false);
    expect(hasPermission(undefined, "canViewOrders")).toBe(false);
  });

  it("ADMIN always passes regardless of explicit permissions", () => {
    const admin = { role: "ADMIN" as const, permissions: {} };
    for (const key of PERMISSION_KEYS) {
      expect(hasPermission(admin, key), `ADMIN should pass ${key}`).toBe(true);
    }
  });

  it("ADMIN passes even with permission explicitly false", () => {
    const admin = { role: "ADMIN" as const, permissions: { canViewOrders: false } };
    expect(hasPermission(admin, "canViewOrders")).toBe(true);
  });

  it("STAFF with default permissions can view orders", () => {
    const staff = { role: "STAFF" as const, permissions: getDefaultPermissions("STAFF") };
    expect(hasPermission(staff, "canViewOrders")).toBe(true);
  });

  it("STAFF with default permissions cannot view finance", () => {
    const staff = { role: "STAFF" as const, permissions: getDefaultPermissions("STAFF") };
    expect(hasPermission(staff, "canViewFinancePage")).toBe(false);
  });

  it("VIEWER with default permissions can view orders but cannot edit", () => {
    const viewer = { role: "VIEWER" as const, permissions: getDefaultPermissions("VIEWER") };
    expect(hasPermission(viewer, "canViewOrders")).toBe(true);
    expect(hasPermission(viewer, "canUploadExcel")).toBe(false);
    expect(hasPermission(viewer, "canDeleteOrders")).toBe(false);
    expect(hasPermission(viewer, "canEditStaffNotes")).toBe(false);
  });

  it("MANAGER with default permissions can do everything except manage users/permissions/CRM", () => {
    const manager = { role: "MANAGER" as const, permissions: getDefaultPermissions("MANAGER") };
    expect(hasPermission(manager, "canViewOrders")).toBe(true);
    expect(hasPermission(manager, "canViewFinancePage")).toBe(true);
    expect(hasPermission(manager, "canManageUsers")).toBe(false);
    expect(hasPermission(manager, "canManagePermissions")).toBe(false);
  });

  it("custom permission group overrides role defaults", () => {
    const customStaff = {
      role: "STAFF" as const,
      permissions: { canViewFinancePage: true, canViewOrders: false },
    };
    expect(hasPermission(customStaff, "canViewFinancePage")).toBe(true);
    expect(hasPermission(customStaff, "canViewOrders")).toBe(false);
  });

  it("user with no permissions object fails all checks", () => {
    const user = { role: "STAFF" as const, permissions: null };
    expect(hasPermission(user, "canViewOrders")).toBe(false);
  });
});

// ============================================================
// requirePermission — returns NextResponse or null
// ============================================================
describe("requirePermission", () => {
  it("returns null (pass) for ADMIN", () => {
    const admin = { role: "ADMIN" as const, permissions: {} };
    expect(requirePermission(admin, "canViewOrders")).toBeNull();
  });

  it("returns null when user has the permission", () => {
    const staff = { role: "STAFF" as const, permissions: { canViewOrders: true } };
    expect(requirePermission(staff, "canViewOrders")).toBeNull();
  });

  it("returns 403 response when user lacks permission", async () => {
    const staff = { role: "STAFF" as const, permissions: { canViewOrders: false } };
    const result = requirePermission(staff, "canViewOrders", "Không có quyền xem đơn");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error).toBe("Không có quyền xem đơn");
  });

  it("returns 403 with default message when no custom message provided", async () => {
    const staff = { role: "STAFF" as const, permissions: {} };
    const result = requirePermission(staff, "canViewOrders");
    expect(result).not.toBeNull();
    const body = await result!.json();
    expect(body.error).toBe("Không có quyền");
  });

  it("returns 403 for null user", () => {
    const result = requirePermission(null, "canViewOrders");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});

// ============================================================
// RBAC matrix — role × permission cross-check
// ============================================================
describe("RBAC matrix", () => {
  const ROLE_PERMISSION_EXPECTATIONS: Record<string, Record<string, boolean>> = {
    ADMIN: {
      canViewOrders: true,
      canDeleteOrders: true,
      canViewFinancePage: true,
      canManageUsers: true,
      canManagePermissions: true,
      canViewDelayed: true,
      canViewReturns: true,
      canViewClaims: true,
      canViewCRM: true,
    },
    MANAGER: {
      canViewOrders: true,
      canDeleteOrders: true,
      canViewFinancePage: true,
      canManageUsers: false,
      canManagePermissions: false,
      canViewDelayed: true,
      canViewReturns: true,
      canViewClaims: true,
    },
    STAFF: {
      canViewOrders: true,
      canDeleteOrders: false,
      canViewFinancePage: false,
      canManageUsers: false,
      canManagePermissions: false,
      canViewDelayed: true,
      canViewReturns: true,
      canViewClaims: true,
      canCreateClaim: true,
      canUpdateClaim: false,
      canViewCompensation: false,
    },
    VIEWER: {
      canViewOrders: true,
      canDeleteOrders: false,
      canViewFinancePage: false,
      canManageUsers: false,
      canUploadExcel: false,
      canCreateClaim: false,
      canViewDelayed: true,
      canViewReturns: true,
      canViewClaims: true,
    },
  };

  for (const [role, expectations] of Object.entries(ROLE_PERMISSION_EXPECTATIONS)) {
    describe(role, () => {
      for (const [perm, expected] of Object.entries(expectations)) {
        it(`${expected ? "can" : "cannot"} ${perm}`, () => {
          const user = {
            role: role as "ADMIN" | "MANAGER" | "STAFF" | "VIEWER",
            permissions: getDefaultPermissions(role as "ADMIN" | "MANAGER" | "STAFF" | "VIEWER"),
          };
          expect(hasPermission(user, perm as keyof typeof user.permissions)).toBe(expected);
        });
      }
    });
  }
});
