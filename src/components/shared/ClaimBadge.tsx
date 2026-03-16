"use client";

const ISSUE_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  SLOW_JOURNEY: { label: "Hành trình chậm", bg: "bg-blue-100", text: "text-blue-700" },
  SUSPICIOUS: { label: "Nghi ngờ", bg: "bg-orange-100", text: "text-orange-700" },
  LOST: { label: "Thất lạc", bg: "bg-red-100", text: "text-red-700" },
  DAMAGED: { label: "Hư hỏng", bg: "bg-purple-100", text: "text-purple-700" },
  OTHER: { label: "Vấn đề khác", bg: "bg-gray-100", text: "text-gray-700" },
};

interface ClaimBadgeProps {
  issueType?: string | null;
}

export function ClaimBadge({ issueType }: ClaimBadgeProps) {
  if (!issueType) return null;
  const cfg = ISSUE_TYPE_CONFIG[issueType] || ISSUE_TYPE_CONFIG.OTHER;
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold leading-tight ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
