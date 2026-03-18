"use client";

import { Loader2 } from "lucide-react";

interface DeleteOrdersDialogProps {
  open: boolean;
  selectedCodes: string[];
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteOrdersDialog({
  open,
  selectedCodes,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteOrdersDialogProps) {
  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onCancel}
    >
      <div
        style={{ background: "#fff", border: "1.5px solid #2563EB", borderRadius: "12px", padding: "24px", width: "480px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#1a1a1a", marginBottom: "8px" }}>
          Xác nhận xóa đơn hàng
        </h3>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>
          Hành động này <b style={{ color: "#dc2626" }}>không thể hoàn tác</b>. Các đơn hàng sau sẽ bị xóa vĩnh viễn:
        </p>
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", marginBottom: "20px", maxHeight: "150px", overflowY: "auto" }}>
          {selectedCodes.slice(0, 10).map((code) => (
            <div key={code} style={{ fontSize: "12px", fontFamily: "monospace", color: "#374151", padding: "2px 0" }}>
              {code}
            </div>
          ))}
          {selectedCodes.length > 10 && (
            <div style={{ fontSize: "12px", color: "#9ca3af", paddingTop: "4px" }}>
              + {selectedCodes.length - 10} đơn khác...
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #e5e7eb", paddingTop: "16px" }}>
          <button
            onClick={onCancel}
            style={{ padding: "8px 16px", fontSize: "13px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", color: "#374151", cursor: "pointer" }}
            disabled={isDeleting}
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              padding: "8px 20px", fontSize: "13px", fontWeight: 600, border: "none", borderRadius: "8px",
              background: isDeleting ? "#9ca3af" : "#dc2626", color: "#fff",
              cursor: isDeleting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            {isDeleting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" style={{ display: "inline" }} /> Đang xóa...</>
            ) : (
              <>🗑 Xóa {selectedCodes.length} đơn</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
