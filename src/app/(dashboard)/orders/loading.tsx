export default function OrdersLoading() {
  return (
    <div className="space-y-3 sm:space-y-4 p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="h-7 w-48 bg-slate-200 rounded" />
          <div className="h-4 w-64 bg-slate-100 rounded mt-2" />
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg" />
      </div>
      {/* Tab navigation skeleton */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <div className="h-9 w-28 bg-slate-200 rounded-md" />
        <div className="h-9 w-36 bg-slate-200/50 rounded-md" />
      </div>
      {/* Filter bar skeleton */}
      <div className="bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-36 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1">
        {/* Table header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-4">
          <div className="h-4 w-8 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-4 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-32 bg-slate-200 rounded flex-1" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-200 rounded" />
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-slate-50 flex items-center gap-4">
            <div className="h-3 w-8 bg-slate-100 rounded" />
            <div className="h-3 w-28 bg-slate-100 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded flex-1" />
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      {/* Pagination skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-slate-100 rounded" />
        <div className="h-8 w-48 bg-slate-100 rounded" />
      </div>
    </div>
  );
}
