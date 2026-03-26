export default function TodosLoading() {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-36 bg-slate-200 rounded" />
          <div className="h-4 w-52 bg-slate-100 rounded mt-2" />
        </div>
        <div className="h-10 w-28 bg-slate-200 rounded-lg" />
      </div>
      {/* Kanban columns skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-3"
          >
            {/* Column header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="h-5 w-24 bg-slate-200 rounded" />
              <div className="h-5 w-6 bg-slate-200 rounded-full" />
            </div>
            {/* Cards */}
            {Array.from({ length: colIdx === 0 ? 3 : colIdx === 1 ? 2 : 1 }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="bg-white rounded-lg border border-slate-100 p-3 space-y-2"
              >
                <div className="h-4 w-full bg-slate-100 rounded" />
                <div className="h-3 w-3/4 bg-slate-100 rounded" />
                <div className="flex items-center justify-between mt-2">
                  <div className="h-5 w-16 bg-slate-100 rounded-full" />
                  <div className="h-5 w-5 bg-slate-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
