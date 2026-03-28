export type IssueTypeKey =
  | "SLOW_JOURNEY"
  | "SUSPICIOUS"
  | "LOST"
  | "DAMAGED"
  | "OTHER"
  | "FEE_COMPLAINT";

export type ClaimStatusKey =
  | "PENDING"
  | "VERIFYING_CARRIER"
  | "CLAIM_SUBMITTED"
  | "COMPENSATION_REQUESTED"
  | "RESOLVED"
  | "CARRIER_COMPENSATED"
  | "CARRIER_REJECTED"
  | "CUSTOMER_COMPENSATED"
  | "CUSTOMER_REJECTED";

export const DEFAULT_ISSUE_TYPE: IssueTypeKey = "SLOW_JOURNEY";

export const ISSUE_TYPE_CONFIG: Record<
  IssueTypeKey,
  { label: string; fullLabel: string; bg: string; text: string; border: string; color: string }
> = {
  SLOW_JOURNEY: {
    label: "Hành trình chậm",
    fullLabel: "Hành trình chậm",
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    color: "#3b82f6",
  },
  SUSPICIOUS: {
    label: "Nghi ngờ",
    fullLabel: "Nghi ngờ",
    bg: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-200",
    color: "#f97316",
  },
  LOST: {
    label: "Thất lạc",
    fullLabel: "Thất lạc",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    color: "#ef4444",
  },
  DAMAGED: {
    label: "Hư hỏng",
    fullLabel: "Hư hỏng",
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
    color: "#8b5cf6",
  },
  OTHER: {
    label: "Vấn đề khác",
    fullLabel: "Vấn đề khác",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
    color: "#6b7280",
  },
  FEE_COMPLAINT: {
    label: "KN Phí",
    fullLabel: "Khiếu nại Cước phí",
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    color: "#d97706",
  },
};

export const ISSUE_TYPE_OPTIONS = (Object.entries(ISSUE_TYPE_CONFIG) as Array<
  [IssueTypeKey, (typeof ISSUE_TYPE_CONFIG)[IssueTypeKey]]
>).map(([value, config]) => ({
  value,
  label: config.label,
  fullLabel: config.fullLabel,
}));

export const CLAIM_STATUS_CONFIG: Record<ClaimStatusKey, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Chưa xử lý", bg: "bg-gray-100", text: "text-gray-700" },
  VERIFYING_CARRIER: { label: "Đang xác minh", bg: "bg-blue-100", text: "text-blue-700" },
  CLAIM_SUBMITTED: { label: "Đã gửi KN", bg: "bg-indigo-100", text: "text-indigo-700" },
  COMPENSATION_REQUESTED: { label: "Đã yêu cầu ĐB", bg: "bg-purple-100", text: "text-purple-700" },
  RESOLVED: { label: "Đã xử lý ✓", bg: "bg-green-100", text: "text-green-700" },
  CARRIER_COMPENSATED: { label: "NVC đã đền bù", bg: "bg-teal-100", text: "text-teal-700" },
  CARRIER_REJECTED: { label: "NVC từ chối", bg: "bg-red-100", text: "text-red-700" },
  CUSTOMER_COMPENSATED: { label: "Đã đền bù KH ✓", bg: "bg-green-100", text: "text-green-700" },
  CUSTOMER_REJECTED: { label: "Từ chối ĐB KH ✓", bg: "bg-orange-100", text: "text-orange-700" },
};

export const CLAIM_STATUS_OPTIONS = (Object.entries(CLAIM_STATUS_CONFIG) as Array<
  [ClaimStatusKey, (typeof CLAIM_STATUS_CONFIG)[ClaimStatusKey]]
>).map(([value, config]) => ({
  value,
  label: config.label,
}));

export const COMPLETION_STATUSES: ClaimStatusKey[] = [
  "RESOLVED",
  "CUSTOMER_COMPENSATED",
  "CUSTOMER_REJECTED",
];

export const AUTO_SCAN_EXCLUDED_ISSUE_TYPES: IssueTypeKey[] = [
  "SUSPICIOUS",
  "DAMAGED",
  "LOST",
  "OTHER",
  "FEE_COMPLAINT",
];

export function getIssueTypeLabel(issueType: string | null | undefined) {
  return ISSUE_TYPE_CONFIG[(issueType as IssueTypeKey) || DEFAULT_ISSUE_TYPE]?.label
    || ISSUE_TYPE_CONFIG[DEFAULT_ISSUE_TYPE].label;
}

export function formatClaimMoney(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}
