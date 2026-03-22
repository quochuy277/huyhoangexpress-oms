"use client";

import { useEffect } from "react";

export default function LandingError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Landing Error]", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
            <h2 className="text-xl font-semibold text-slate-800">Đã xảy ra lỗi</h2>
            <p className="text-sm text-slate-500 text-center max-w-md">
                Trang web gặp sự cố. Vui lòng tải lại trang.
            </p>
            <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
                Tải lại
            </button>
        </div>
    );
}
