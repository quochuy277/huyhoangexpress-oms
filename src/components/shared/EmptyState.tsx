import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-12 text-center" +
        (className ? ` ${className}` : "")
      }
      role="status"
    >
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        {description ? (
          <p className="text-sm text-gray-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
