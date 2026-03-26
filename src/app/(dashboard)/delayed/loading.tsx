export default function DelayedLoading() {
  return (
    <div className="flex-1 space-y-6 pt-2 pb-8 p-4 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded" />
          <div className="h-7 w-52 bg-slate-200 rounded" />
        </div>
        <div className="h-4 w-80 bg-slate-100 rounded mt-2" />
      </div>
      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-100 p-4 space-y-2"
          >
            <div className="h-3 w-16 bg-slate-200 rounded" />
            <div className="h-7 w-12 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-50 rounded-lg" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded" />
          <div className="h-64 bg-slate-50 rounded-lg" />
        </div>
      </div>
      {/* Filter skeleton */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 w-32 bg-slate-100 rounded-lg" />
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
