export default function DashboardLoading() {
    return (
        <div className="p-4 sm:p-6 space-y-6 animate-pulse">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-xl border border-slate-100 p-4 space-y-3"
                    >
                        <div className="h-3 w-20 bg-slate-200 rounded" />
                        <div className="h-7 w-28 bg-slate-200 rounded" />
                        <div className="h-2 w-16 bg-slate-100 rounded" />
                    </div>
                ))}
            </div>

            {/* Table placeholder */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="h-5 w-32 bg-slate-200 rounded" />
                    <div className="flex gap-2">
                        <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                        <div className="h-8 w-24 bg-slate-100 rounded-lg" />
                    </div>
                </div>
                {/* Rows */}
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="px-4 py-3 border-b border-slate-50 flex items-center gap-4"
                    >
                        <div className="h-3 w-24 bg-slate-100 rounded" />
                        <div className="h-3 w-20 bg-slate-100 rounded" />
                        <div className="h-3 w-32 bg-slate-100 rounded flex-1" />
                        <div className="h-5 w-20 bg-slate-100 rounded-full" />
                        <div className="h-3 w-16 bg-slate-100 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
