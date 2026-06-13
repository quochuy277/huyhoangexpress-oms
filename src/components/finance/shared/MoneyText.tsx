import { formatVnd } from "@/lib/finance/format";

interface MoneyTextProps {
  value: number;
  /** Tô xanh khi ≥ 0, đỏ khi < 0 */
  colored?: boolean;
  /** Thêm dấu + cho số dương */
  showPlus?: boolean;
  className?: string;
}

export function MoneyText({ value, colored, showPlus, className }: MoneyTextProps) {
  const sign = showPlus && value > 0 ? "+" : "";
  const colorClass = colored ? (value >= 0 ? "text-emerald-600" : "text-red-600") : "";
  return <span className={`${colorClass} ${className ?? ""}`.trim()}>{sign}{formatVnd(value)}</span>;
}
