const TONE: Record<string, string> = {
  blue: "border-l-blue-600",
  green: "border-l-emerald-500",
  amber: "border-l-amber-500",
  violet: "border-l-violet-500",
};

interface KpiCardProps {
  label: string;
  value: string;
  tone?: keyof typeof TONE;
  deltaPercent?: number | null;
  deltaSuffix?: string;
  targetPercent?: number | null;
  targetLabel?: string;
}

export function KpiCard({ label, value, tone = "blue", deltaPercent, deltaSuffix, targetPercent, targetLabel }: KpiCardProps) {
  const hasDelta = deltaPercent !== undefined;
  const up = (deltaPercent ?? 0) >= 0;
  return (
    <div className={`rounded-xl border-l-4 bg-white p-[18px_20px] shadow-sm ${TONE[tone]}`} style={{ minWidth: 200 }}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-[22px] font-bold text-slate-800">{value}</div>
      {hasDelta && (
        <div className={`text-[11px] font-semibold ${deltaPercent === null ? "text-slate-400" : up ? "text-emerald-500" : "text-red-500"}`}>
          {deltaPercent === null ? "—" : `${up ? "▲" : "▼"} ${Math.abs(deltaPercent)}%`}{deltaSuffix ? ` ${deltaSuffix}` : ""}
        </div>
      )}
      {targetPercent != null && (
        <>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(targetPercent, 100)}%` }} />
          </div>
          {targetLabel && <div className="mt-1 text-[10px] text-slate-400">{targetLabel}</div>}
        </>
      )}
    </div>
  );
}
