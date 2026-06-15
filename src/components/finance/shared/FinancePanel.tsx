// src/components/finance/shared/FinancePanel.tsx
import type { ReactNode } from "react";

interface FinancePanelProps {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function FinancePanel({ title, actions, className, children }: FinancePanelProps) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className ?? ""}`.trim()}>
      {(title || actions) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {title && <h3 className="text-base font-bold text-slate-800">{title}</h3>}
          {actions && <div className="flex flex-col gap-2 sm:flex-row">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
