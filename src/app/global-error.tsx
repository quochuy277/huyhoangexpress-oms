"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

// Catches errors that escape the root layout itself (layout.tsx crash, provider
// errors, etc.). Must render its own <html>/<body> because the root layout
// failed. Leave styling minimal — the app CSS may not have loaded.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
    reportClientError("global", error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: 480, padding: 24, textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "9999px",
              background: "#fee2e2",
              color: "#b91c1c",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
            Đã xảy ra lỗi nghiêm trọng
          </h1>
          <p style={{ fontSize: 14, color: "#475569", margin: "0 0 16px" }}>
            Ứng dụng không thể hiển thị trang này. Vui lòng tải lại hoặc liên hệ
            quản trị viên nếu lỗi tiếp tục.
          </p>
          {error.digest ? (
            <p
              style={{
                fontSize: 12,
                color: "#94a3b8",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                marginBottom: 16,
              }}
            >
              Mã lỗi: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              background: "#2563eb",
              border: 0,
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
