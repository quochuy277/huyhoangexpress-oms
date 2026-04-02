"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Paperclip, X } from "lucide-react";

import { sanitizeHtml } from "@/lib/sanitize";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9998,
  backgroundColor: "rgba(0,0,0,0.5)",
};

const dialogBase: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 9999,
  width: "600px",
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "80vh",
  background: "#FFFFFF",
  border: "1.5px solid #2563EB",
  borderRadius: "12px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: "16px",
  marginBottom: "20px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#1a1a1a",
};

const closeButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px",
  borderRadius: "6px",
  color: "#666",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export interface AnnouncementPreviewItem {
  id: string;
  title: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  isPinned: boolean;
  createdByName: string;
  createdAt: string;
  isRead: boolean;
}

interface AnnouncementPreviewContentProps {
  announcement: AnnouncementPreviewItem;
}

interface AnnouncementPreviewDialogProps {
  announcement: AnnouncementPreviewItem | null;
  onClose: () => void;
}

export function AnnouncementPreviewContent({ announcement }: AnnouncementPreviewContentProps) {
  return (
    <>
      <div style={{ overflowY: "auto", flex: 1, maxHeight: "calc(80vh - 150px)" }}>
        <div
          style={{ fontSize: "14px", lineHeight: 1.7, color: "#374151" }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(announcement.content) }}
        />

        {announcement.attachmentUrl && (
          <div
            style={{
              marginTop: "16px",
              padding: "10px 14px",
              background: "#f9fafb",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Paperclip style={{ width: "14px", height: "14px", color: "#6b7280" }} />
            <a
              href={announcement.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: "13px", color: "#2563EB", textDecoration: "underline" }}
            >
              {announcement.attachmentName || "Tải file đính kèm"}
            </a>
          </div>
        )}
      </div>

      <div style={{ marginTop: "16px", fontSize: "12px", color: "#9ca3af" }}>
        Đăng bởi {announcement.createdByName} • {new Date(announcement.createdAt).toLocaleString("vi-VN")}
      </div>
    </>
  );
}

export function AnnouncementPreviewDialog({ announcement, onClose }: AnnouncementPreviewDialogProps) {
  useEffect(() => {
    if (!announcement) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [announcement, onClose]);

  if (!announcement || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div role="dialog" aria-modal="true" aria-labelledby="announcement-preview-title" style={dialogBase}>
        <div style={headerStyle}>
          <span id="announcement-preview-title" style={titleStyle}>
            {announcement.title}
          </span>
          <button onClick={onClose} style={closeButtonStyle} aria-label="Đóng xem thông báo">
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        <AnnouncementPreviewContent announcement={announcement} />
      </div>
    </>,
    document.body,
  );
}
