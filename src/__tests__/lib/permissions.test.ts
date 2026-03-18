import { describe, it, expect } from "vitest";
import {
  getDefaultPermissions,
  extractPermissions,
  PERMISSION_KEYS,
} from "@/lib/permissions";

// ============================================================
// getDefaultPermissions
// ============================================================
describe("getDefaultPermissions", () => {
  describe("ADMIN", () => {
    it("has all permissions set to true", () => {
      const perms = getDefaultPermissions("ADMIN");
      for (const key of PERMISSION_KEYS) {
        expect(perms[key], `ADMIN should have ${key} = true`).toBe(true);
      }
    });

    it("has exactly PERMISSION_KEYS.length permissions", () => {
      const perms = getDefaultPermissions("ADMIN");
      expect(Object.keys(perms)).toHaveLength(PERMISSION_KEYS.length);
    });
  });

  describe("MANAGER", () => {
    it("has all permissions except canManageUsers and canManagePermissions", () => {
      const perms = getDefaultPermissions("MANAGER");
      expect(perms.canManageUsers).toBe(false);
      expect(perms.canManagePermissions).toBe(false);
    });

    it("has all other permissions as true", () => {
      const perms = getDefaultPermissions("MANAGER");
      const otherKeys = PERMISSION_KEYS.filter(
        (k) => k !== "canManageUsers" && k !== "canManagePermissions"
      );
      for (const key of otherKeys) {
        expect(perms[key], `MANAGER should have ${key} = true`).toBe(true);
      }
    });

    it("can view finance", () => {
      const perms = getDefaultPermissions("MANAGER");
      expect(perms.canViewFinancePage).toBe(true);
      expect(perms.canViewRevenue).toBe(true);
    });
  });

  describe("STAFF", () => {
    it("can view orders", () => {
      expect(getDefaultPermissions("STAFF").canViewOrders).toBe(true);
    });

    it("can upload excel", () => {
      expect(getDefaultPermissions("STAFF").canUploadExcel).toBe(true);
    });

    it("can edit staff notes", () => {
      expect(getDefaultPermissions("STAFF").canEditStaffNotes).toBe(true);
    });

    it("can view delayed orders", () => {
      expect(getDefaultPermissions("STAFF").canViewDelayed).toBe(true);
    });

    it("can view returns", () => {
      expect(getDefaultPermissions("STAFF").canViewReturns).toBe(true);
    });

    it("can view claims", () => {
      expect(getDefaultPermissions("STAFF").canViewClaims).toBe(true);
    });

    it("can create claims", () => {
      expect(getDefaultPermissions("STAFF").canCreateClaim).toBe(true);
    });

    it("cannot delete orders", () => {
      expect(getDefaultPermissions("STAFF").canDeleteOrders).toBe(false);
    });

    it("cannot view finance page", () => {
      expect(getDefaultPermissions("STAFF").canViewFinancePage).toBe(false);
    });

    it("cannot manage users", () => {
      expect(getDefaultPermissions("STAFF").canManageUsers).toBe(false);
    });

    it("cannot update claims", () => {
      expect(getDefaultPermissions("STAFF").canUpdateClaim).toBe(false);
    });
  });

  describe("VIEWER", () => {
    it("can view orders", () => {
      expect(getDefaultPermissions("VIEWER").canViewOrders).toBe(true);
    });

    it("can view delayed orders", () => {
      expect(getDefaultPermissions("VIEWER").canViewDelayed).toBe(true);
    });

    it("can view returns", () => {
      expect(getDefaultPermissions("VIEWER").canViewReturns).toBe(true);
    });

    it("can view claims", () => {
      expect(getDefaultPermissions("VIEWER").canViewClaims).toBe(true);
    });

    it("cannot upload excel", () => {
      expect(getDefaultPermissions("VIEWER").canUploadExcel).toBe(false);
    });

    it("cannot create claims", () => {
      expect(getDefaultPermissions("VIEWER").canCreateClaim).toBe(false);
    });

    it("cannot manage users", () => {
      expect(getDefaultPermissions("VIEWER").canManageUsers).toBe(false);
    });

    it("cannot view finance", () => {
      expect(getDefaultPermissions("VIEWER").canViewFinancePage).toBe(false);
      expect(getDefaultPermissions("VIEWER").canViewRevenue).toBe(false);
    });

    it("has exactly 4 true permissions", () => {
      const perms = getDefaultPermissions("VIEWER");
      const trueCount = PERMISSION_KEYS.filter((k) => perms[k]).length;
      expect(trueCount).toBe(4);
    });
  });
});

// ============================================================
// extractPermissions
// ============================================================
describe("extractPermissions", () => {
  it("extracts true permissions from group record", () => {
    const group: Record<string, unknown> = {
      canViewOrders: true,
      canUploadExcel: true,
      canDeleteOrders: false,
      canEditStaffNotes: true,
      canViewRevenue: false,
      canViewCarrierFee: false,
      canViewFinancePage: false,
      canViewDashboardFinance: false,
      canViewDelayed: true,
      canViewReturns: true,
      canConfirmReturn: false,
      canViewClaims: true,
      canCreateClaim: true,
      canUpdateClaim: false,
      canViewAllTodos: false,
      canViewAllAttendance: false,
      canEditAttendance: false,
      canScoreEmployees: false,
      canManageUsers: false,
      canManagePermissions: false,
    };

    const perms = extractPermissions(group);

    expect(perms.canViewOrders).toBe(true);
    expect(perms.canUploadExcel).toBe(true);
    expect(perms.canDeleteOrders).toBe(false);
    expect(perms.canViewDelayed).toBe(true);
    expect(perms.canViewClaims).toBe(true);
    expect(perms.canManageUsers).toBe(false);
  });

  it("treats missing keys as false", () => {
    const group: Record<string, unknown> = {};
    const perms = extractPermissions(group);

    for (const key of PERMISSION_KEYS) {
      expect(perms[key], `Missing key ${key} should be false`).toBe(false);
    }
  });

  it("treats non-boolean truthy values as false", () => {
    const group: Record<string, unknown> = {
      canViewOrders: 1,
      canUploadExcel: "true",
      canDeleteOrders: true,
    };
    const perms = extractPermissions(group);

    expect(perms.canViewOrders).toBe(false);
    expect(perms.canUploadExcel).toBe(false);
    expect(perms.canDeleteOrders).toBe(true);
  });
});
