"use client";

interface SegmentItem {
  id: string;
  label: string;
}

interface SegmentedNavProps {
  items: SegmentItem[];
  active: string;
  onChange: (id: string) => void;
}

export function SegmentedNav({ items, active, onChange }: SegmentedNavProps) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            active === item.id ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
