"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, RefreshCw, Package } from "lucide-react";
import { TrackingTimeline } from "./TrackingTimeline";

interface TrackingPopupProps {
  requestCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TrackingPopup({ requestCode, isOpen, onClose }: TrackingPopupProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return createPortal(
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)",
        }}
        onClick={onClose}
      />

      <div
        className="tracking-popup-shell"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10001,
          background: "#FFFFFF",
          border: "1.5px solid #2563EB",
          borderRadius: "12px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          width: "min(520px, calc(100vw - 32px))",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          animation: "trackingPopIn 0.2s ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e5e7eb",
            padding: "14px 16px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                padding: "6px",
                borderRadius: "8px",
                background: "#eff6ff",
              }}
            >
              <Package size={18} color="#2563EB" />
            </div>
            <div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "#1a1a1a",
                }}
              >
                Hành trình đơn hàng
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  fontFamily: "monospace",
                  marginTop: "1px",
                }}
              >
                {requestCode}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              color: "#666",
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Đóng hành trình đơn hàng"
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
          }}
        >
          <TrackingTimeline key={refreshKey} requestCode={requestCode} showHeader={false} />
        </div>

        <div
          className="tracking-popup-footer"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            borderTop: "1px solid #e5e7eb",
            padding: "12px 16px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleRefresh}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "9px 14px",
              border: "1.5px solid #93c5fd",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#2563EB",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <RefreshCw size={13} /> Làm mới
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "9px 14px",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              background: "#fff",
              color: "#374151",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Đóng
          </button>
        </div>
      </div>

      <style>{`
        @keyframes trackingPopIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.95) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }
        @media (max-width: 640px) {
          .tracking-popup-shell {
            inset: 0 !important;
            top: 0 !important;
            left: 0 !important;
            transform: none !important;
            width: 100vw !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            border-width: 0 !important;
          }

          .tracking-popup-footer {
            flex-wrap: wrap;
            justify-content: stretch !important;
          }

          .tracking-popup-footer > button {
            flex: 1 1 calc(50% - 5px);
          }
        }
      `}</style>
    </>,
    document.body
  );
}
