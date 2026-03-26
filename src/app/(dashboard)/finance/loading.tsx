export default function FinanceLoading() {
  return (
    <div className="space-y-6 p-4 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-40 bg-slate-200 rounded" />
        <div className="h-4 w-56 bg-slate-100 rounded mt-2" />
      </div>
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-100 p-5 space-y-3"
          >
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-8 w-28 bg-slate-200 rounded" />
            <div className="h-2 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      {/* Chart area skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="h-5 w-36 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-50 rounded-lg" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="h-5 w-36 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-50 rounded-lg" />
        </div>
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
            <div className="h-8 w-24 bg-slate-100 rounded-lg" />
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-slate-50 flex items-center gap-4">
            <div className="h-3 w-24 bg-slate-100 rounded" />
            <div className="h-3 w-20 bg-slate-100 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded flex-1" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
