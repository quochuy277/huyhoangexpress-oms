export type ConfirmDialogTone = "info" | "warning" | "danger" | "success";

export type ConfirmDialogToneConfig = {
  accent: string;
  border: string;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  confirmBg: string;
  confirmHover: string;
  confirmText: string;
  secondaryBorder: string;
  secondaryText: string;
  secondaryHover: string;
};

export type ConfirmDialogCopy = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmDialogTone;
};

const TONE_CONFIG: Record<ConfirmDialogTone, ConfirmDialogToneConfig> = {
  info: {
    accent: "#2563EB",
    border: "#bfdbfe",
    iconBg: "#eff6ff",
    iconBorder: "#bfdbfe",
    iconColor: "#2563EB",
    confirmBg: "#2563EB",
    confirmHover: "#1d4ed8",
    confirmText: "#FFFFFF",
    secondaryBorder: "#dbeafe",
    secondaryText: "#1d4ed8",
    secondaryHover: "#f8fbff",
  },
  warning: {
    accent: "#d97706",
    border: "#fcd34d",
    iconBg: "#fffbeb",
    iconBorder: "#fde68a",
    iconColor: "#d97706",
    confirmBg: "#d97706",
    confirmHover: "#b45309",
    confirmText: "#FFFFFF",
    secondaryBorder: "#f3f4f6",
    secondaryText: "#475569",
    secondaryHover: "#f8fafc",
  },
  danger: {
    accent: "#dc2626",
    border: "#fecaca",
    iconBg: "#fef2f2",
    iconBorder: "#fecaca",
    iconColor: "#dc2626",
    confirmBg: "#dc2626",
    confirmHover: "#b91c1c",
    confirmText: "#FFFFFF",
    secondaryBorder: "#e5e7eb",
    secondaryText: "#475569",
    secondaryHover: "#f8fafc",
  },
  success: {
    accent: "#16a34a",
    border: "#bbf7d0",
    iconBg: "#f0fdf4",
    iconBorder: "#bbf7d0",
    iconColor: "#16a34a",
    confirmBg: "#16a34a",
    confirmHover: "#15803d",
    confirmText: "#FFFFFF",
    secondaryBorder: "#e5e7eb",
    secondaryText: "#475569",
    secondaryHover: "#f8fafc",
  },
};

export function getConfirmDialogToneConfig(tone: ConfirmDialogTone): ConfirmDialogToneConfig {
  return TONE_CONFIG[tone];
}

export function getDuplicateClaimDialogCopy(requestCode: string): ConfirmDialogCopy {
  return {
    title: "Đơn đã có trong Đơn có vấn đề",
    description: `Đơn ${requestCode} đã có trong Đơn có vấn đề. Bạn có muốn mở chi tiết đơn hiện có để sửa lại không?`,
    confirmLabel: "Mở chi tiết để sửa",
    cancelLabel: "Để sau",
    tone: "info",
  };
}

export function getUnsavedClaimDialogCopy(): ConfirmDialogCopy {
  return {
    title: "Bạn có thay đổi chưa lưu",
    description: "Nếu thoát bây giờ, các thay đổi chưa lưu sẽ bị mất.",
    confirmLabel: "Thoát không lưu",
    cancelLabel: "Tiếp tục chỉnh sửa",
    tone: "warning",
  };
}
