import type { Role } from "@prisma/client";

/** Flat permission set — matches PermissionGroup boolean fields */
export interface PermissionSet {
  canViewOrders: boolean;
  canUploadExcel: boolean;
  canDeleteOrders: boolean;
  canEditStaffNotes: boolean;
  canViewRevenue: boolean;
  canViewCarrierFee: boolean;
  canViewFinancePage: boolean;
  canViewDashboardFinance: boolean;
  canViewDelayed: boolean;
  canViewReturns: boolean;
  canConfirmReturn: boolean;
  canViewClaims: boolean;
  canCreateClaim: boolean;
  canUpdateClaim: boolean;
  canViewAllTodos: boolean;
  canViewAllAttendance: boolean;
  canEditAttendance: boolean;
  canScoreEmployees: boolean;
  canManageUsers: boolean;
  canManagePermissions: boolean;
}

/** All permission keys */
export const PERMISSION_KEYS: (keyof PermissionSet)[] = [
  "canViewOrders", "canUploadExcel", "canDeleteOrders", "canEditStaffNotes",
  "canViewRevenue", "canViewCarrierFee", "canViewFinancePage", "canViewDashboardFinance",
  "canViewDelayed", "canViewReturns", "canConfirmReturn",
  "canViewClaims", "canCreateClaim", "canUpdateClaim",
  "canViewAllTodos",
  "canViewAllAttendance", "canEditAttendance", "canScoreEmployees",
  "canManageUsers", "canManagePermissions",
];

/** Fallback permissions based on legacy Role enum (for users without permissionGroup) */
export function getDefaultPermissions(role: Role): PermissionSet {
  const allTrue = Object.fromEntries(PERMISSION_KEYS.map(k => [k, true])) as unknown as PermissionSet;
  const allFalse = Object.fromEntries(PERMISSION_KEYS.map(k => [k, false])) as unknown as PermissionSet;

  switch (role) {
    case "ADMIN":
      return allTrue;

    case "MANAGER":
      return { ...allTrue, canManageUsers: false, canManagePermissions: false };

    case "STAFF":
      return {
        ...allFalse,
        canViewOrders: true,
        canUploadExcel: true,
        canEditStaffNotes: true,
        canViewDelayed: true,
        canViewReturns: true,
        canViewClaims: true,
        canCreateClaim: true,
      };

    case "VIEWER":
      return {
        ...allFalse,
        canViewOrders: true,
        canViewDelayed: true,
        canViewReturns: true,
        canViewClaims: true,
      };

    default:
      return allFalse;
  }
}

/** Extract PermissionSet from a PermissionGroup DB record */
export function extractPermissions(group: Record<string, unknown>): PermissionSet {
  const perms = {} as PermissionSet;
  for (const key of PERMISSION_KEYS) {
    perms[key] = group[key] === true;
  }
  return perms;
}

/** Vietnamese labels for permission categories */
export const PERMISSION_CATEGORIES = [
  {
    title: "Quản lý đơn hàng",
    keys: [
      { key: "canViewOrders" as const, label: "Xem đơn hàng" },
      { key: "canUploadExcel" as const, label: "Tải lên file Excel" },
      { key: "canDeleteOrders" as const, label: "Xóa đơn hàng" },
      { key: "canEditStaffNotes" as const, label: "Sửa ghi chú" },
    ],
  },
  {
    title: "Tài chính",
    highlight: true,
    keys: [
      { key: "canViewRevenue" as const, label: "Xem cột Doanh thu trên bảng đơn" },
      { key: "canViewCarrierFee" as const, label: "Xem cột Phí Đối Tác Thu" },
      { key: "canViewFinancePage" as const, label: "Truy cập trang Tài Chính" },
      { key: "canViewDashboardFinance" as const, label: "Xem thẻ tài chính trên Dashboard" },
    ],
  },
  {
    title: "Chăm sóc đơn Hoãn",
    keys: [
      { key: "canViewDelayed" as const, label: "Xem trang Chăm sóc đơn Hoãn" },
    ],
  },
  {
    title: "Theo dõi đơn Hoàn",
    keys: [
      { key: "canViewReturns" as const, label: "Xem trang Theo dõi đơn Hoàn" },
      { key: "canConfirmReturn" as const, label: "Xác nhận đã trả hàng cho khách" },
    ],
  },
  {
    title: "Khiếu nại / Bồi hoàn",
    keys: [
      { key: "canViewClaims" as const, label: "Xem khiếu nại" },
      { key: "canCreateClaim" as const, label: "Tạo khiếu nại mới" },
      { key: "canUpdateClaim" as const, label: "Cập nhật trạng thái khiếu nại" },
    ],
  },
  {
    title: "Công việc",
    keys: [
      { key: "canViewAllTodos" as const, label: "Xem tất cả công việc" },
    ],
  },
  {
    title: "Chấm công",
    keys: [
      { key: "canViewAllAttendance" as const, label: "Xem chấm công tất cả nhân viên" },
      { key: "canEditAttendance" as const, label: "Chỉnh sửa chấm công" },
      { key: "canScoreEmployees" as const, label: "Chấm điểm nhân viên" },
    ],
  },
  {
    title: "Quản trị",
    keys: [
      { key: "canManageUsers" as const, label: "Quản lý nhân viên" },
      { key: "canManagePermissions" as const, label: "Quản lý nhóm quyền" },
    ],
  },
];
