"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

interface UploadSummary {
  totalRows: number;
  validRows: number;
  newOrders: number;
  updatedOrders: number;
  skippedRows: number;
  failedRows: number;
  parseErrors: number;
  processingTime: number;
}

interface UploadError {
  row: number;
  field: string;
  value: string;
  message: string;
}

interface UploadResult {
  success: boolean;
  summary: UploadSummary;
  errors: UploadError[];
}

interface ExcelUploadProps {
  onUploadComplete?: () => void;
}

export function ExcelUpload({ onUploadComplete }: ExcelUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    // Validate
    const validExtensions = [".xlsx", ".xls"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(ext)) {
      setError("Chỉ chấp nhận file .xlsx hoặc .xls");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File quá lớn. Tối đa 10MB");
      return;
    }

    setError(null);
    setResult(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/orders/upload", {
        method: "POST",
        body: formData,
      });

      const data: UploadResult = await res.json();

      if (!res.ok) {
        setError((data as unknown as { error: string }).error || "Lỗi tải lên");
      } else {
        setResult(data);
        if (data.success) {
          onUploadComplete?.();
        }
      }
    } catch {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
          }
          ${isUploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-600 font-medium">
              Đang xử lý file Excel...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Upload className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Kéo thả file Excel vào đây
              </p>
              <p className="text-xs text-slate-400 mt-1">
                hoặc click để chọn file • .xlsx, .xls • Tối đa 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Upload result */}
      {result && (
        <div className="space-y-3">
          {/* Summary */}
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
              result.success
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            {result.success
              ? `Tải lên thành công! (${(result.summary.processingTime / 1000).toFixed(1)}s)`
              : "Tải lên thất bại"
            }
          </div>

          {/* Stats grid */}
          {result.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Tổng dòng", value: result.summary.totalRows, icon: FileSpreadsheet, color: "text-slate-600" },
                { label: "Đơn mới", value: result.summary.newOrders, icon: CheckCircle2, color: "text-emerald-600" },
                { label: "Đã cập nhật", value: result.summary.updatedOrders, icon: CheckCircle2, color: "text-blue-600" },
                { label: "Lỗi", value: result.summary.failedRows + result.summary.parseErrors, icon: AlertTriangle, color: "text-red-600" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <div>
                      <p className="text-xs text-slate-400">{stat.label}</p>
                      <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Error details */}
          {result.errors.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 font-medium">
                Chi tiết lỗi ({result.errors.length} dòng) ▸
              </summary>
              <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-slate-500 font-medium">Dòng</th>
                      <th className="px-3 py-1.5 text-left text-slate-500 font-medium">Trường</th>
                      <th className="px-3 py-1.5 text-left text-slate-500 font-medium">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.errors.map((err, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-600">{err.row}</td>
                        <td className="px-3 py-1.5 text-slate-600">{err.field}</td>
                        <td className="px-3 py-1.5 text-red-600">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
