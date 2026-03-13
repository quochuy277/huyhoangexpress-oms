import type {
  Order,
  User,
  ClaimOrder,
  ReturnTracking,
  TodoItem,
  UploadHistory,
  Attendance,
  LoginHistory,
  EmployeeScore,
  DeliveryStatus,
  Role,
  ClaimStatus,
  ClaimType,
  ReturnStatus,
  ReturnType,
  TodoStatus,
  Priority,
  AttendanceStatus,
} from "@prisma/client";

// Re-export Prisma types for convenience
export type {
  Order,
  User,
  ClaimOrder,
  ReturnTracking,
  TodoItem,
  UploadHistory,
  Attendance,
  LoginHistory,
  EmployeeScore,
};

export {
  type DeliveryStatus,
  type Role,
  type ClaimStatus,
  type ClaimType,
  type ReturnStatus,
  type ReturnType,
  type TodoStatus,
  type Priority,
  type AttendanceStatus,
};

// ======== API Response Types ========

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ======== Excel Upload Types ========

export interface ExcelParseResult {
  rows: Record<string, unknown>[];
  totalRows: number;
  headers: string[];
  errors: string[];
}

export interface UploadResult {
  newOrders: number;
  updatedOrders: number;
  skippedRows: number;
  failedRows: number;
  errors: string[];
  processingTime: number;
}

// ======== Delayed Order Types ========

export interface DelayEvent {
  time: string;
  date: string;
  reason: string;
}

export interface DelayedOrderData {
  requestCode: string;
  shopName: string | null;
  carrierOrderCode: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  receiverAddress: string | null;
  receiverWard: string | null;
  receiverDistrict: string | null;
  receiverProvince: string | null;
  status: string;
  codAmount: number;
  createdTime: Date | null;
  delayCount: number;
  delays: DelayEvent[];
  uniqueReasons: string[];
  risk: "high" | "medium" | "low";
  riskScore: number;
  daysAge: number;
}

export interface DelayedOrderStats {
  total: number;
  high: number;
  medium: number;
  low: number;
  totalCOD: number;
  highCOD: number;
}

export interface DelayedOrderResponse {
  orders: DelayedOrderData[];
  stats: DelayedOrderStats;
}

// ======== Dashboard Types ========

export interface DashboardStats {
  ordersToday: number;
  ordersWeek: number;
  ordersMonth: number;
  deliveredToday: number;
  delayedCount: number;
  returnCount: number;
  claimCount: number;
  revenue: number;
  cost: number;
  profit: number;
}

// ======== Carrier & Region Constants ========

export const CARRIERS = ["GHN", "GTK", "BSI", "JAT", "SPX"] as const;
export type CarrierName = (typeof CARRIERS)[number];

export const CARRIER_LABELS: Record<string, string> = {
  GHN: "Giao Hàng Nhanh",
  GTK: "Giao Tiết Kiệm",
  BSI: "Best Express",
  JAT: "J&T Express",
  SPX: "Shopee Express",
};

export const REGION_GROUPS = [
  "0.Nội Tỉnh-Nội Huyện",
  "1.Nội Tỉnh-Liên Huyện Gần",
  "2.Nội Tỉnh-Liên Huyện Xa",
  "3.Nội Miền-Thành Phố",
  "4.Nội Miền-Huyện",
  "5.Liên Miền-Thành Phố",
  "6.Liên Miền-Huyện",
] as const;
