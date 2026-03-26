export default function ReturnsLoading() {
  return (
    <div className="flex flex-col h-full gap-4 p-4 animate-pulse">
      {/* Page Title */}
      <div>
        <div className="h-7 w-52 bg-slate-200 rounded" />
        <div className="h-4 w-72 bg-slate-100 rounded mt-2" />
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-100 rounded-lg" />
              <div>
                <div className="h-7 w-12 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Tab headers skeleton */}
      <div className="flex gap-4 border-b-2 border-slate-200 pb-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-36 bg-slate-100 rounded-t-md" />
        ))}
      </div>
      {/* Filter skeleton */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-36 bg-slate-100 rounded-lg" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-4">
          <div className="h-4 w-8 bg-slate-200 rounded" />
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-4 w-32 bg-slate-200 rounded flex-1" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-slate-50 flex items-center gap-4">
            <div className="h-3 w-8 bg-slate-100 rounded" />
            <div className="h-3 w-28 bg-slate-100 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded flex-1" />
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
