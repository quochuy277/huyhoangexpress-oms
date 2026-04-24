"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Dashboard Error]", error);
        reportClientError("dashboard", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Đã xảy ra lỗi</h2>
            <p className="text-sm text-slate-500 text-center max-w-md">
                Hệ thống gặp sự cố khi xử lý yêu cầu. Vui lòng thử lại hoặc liên hệ quản trị viên nếu lỗi tiếp tục.
            </p>
            {error.digest && (
                <p className="text-xs text-slate-400 font-mono">Mã lỗi: {error.digest}</p>
            )}
            <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
                Thử lại
            </button>
        </div>
    );
}
