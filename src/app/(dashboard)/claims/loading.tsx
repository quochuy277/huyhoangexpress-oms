export default function ClaimsLoading() {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="h-7 w-44 bg-slate-200 rounded" />
          <div className="h-4 w-60 bg-slate-100 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-slate-200 rounded-lg" />
          <div className="h-10 w-28 bg-slate-200 rounded-lg" />
        </div>
      </div>
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-100 p-4 space-y-3"
          >
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-7 w-16 bg-slate-200 rounded" />
            <div className="h-2 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      {/* Filter bar skeleton */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-36 bg-slate-100 rounded-lg" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-4">
          <div className="h-4 w-8 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-32 bg-slate-200 rounded flex-1" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-slate-50 flex items-center gap-4">
            <div className="h-3 w-8 bg-slate-100 rounded" />
            <div className="h-3 w-28 bg-slate-100 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded flex-1" />
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
