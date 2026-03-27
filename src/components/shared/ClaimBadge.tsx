"use client";

import { DEFAULT_ISSUE_TYPE, ISSUE_TYPE_CONFIG } from "@/lib/claims-config";

interface ClaimBadgeProps {
  issueType?: string | null;
}

export function ClaimBadge({ issueType }: ClaimBadgeProps) {
  if (!issueType) return null;

  const cfg = ISSUE_TYPE_CONFIG[issueType as keyof typeof ISSUE_TYPE_CONFIG] || ISSUE_TYPE_CONFIG[DEFAULT_ISSUE_TYPE];

  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold leading-tight ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
