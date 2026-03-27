"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";

import { ConfirmDialogTone, getConfirmDialogToneConfig } from "@/lib/confirm-dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  icon: React.ReactNode;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Hủy",
  tone = "info",
  icon,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const colors = getConfirmDialogToneConfig(tone);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose, open]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[10080] bg-slate-950/45 backdrop-blur-[3px]"
        onClick={() => {
          if (!loading) {
            onClose();
          }
        }}
      />

      <div
        className="fixed left-1/2 top-1/2 z-[10081] w-[440px] max-w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[20px] bg-white shadow-[0_22px_60px_rgba(15,23,42,0.24)] animate-[confirmDialogPopIn_0.22s_ease-out]"
        style={{ border: `1.5px solid ${colors.border}` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: colors.accent }} />

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>

        <div className="px-6 pb-6 pt-7 sm:px-7 sm:pb-7 sm:pt-8">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2"
            style={{ background: colors.iconBg, borderColor: colors.iconBorder, color: colors.iconColor }}
          >
            {icon}
          </div>

          <div className="text-center">
            <h2 id="confirm-dialog-title" className="text-[18px] font-bold tracking-[-0.01em] text-slate-900">
              {title}
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              {description}
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="min-h-11 flex-1 rounded-xl border px-4 py-3 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                borderColor: colors.secondaryBorder,
                color: colors.secondaryText,
                background: "#FFFFFF",
              }}
              onMouseEnter={(event) => {
                if (!loading) {
                  event.currentTarget.style.background = colors.secondaryHover;
                }
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "#FFFFFF";
              }}
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="min-h-11 flex-1 rounded-xl border border-transparent px-4 py-3 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: colors.confirmBg,
                color: colors.confirmText,
              }}
              onMouseEnter={(event) => {
                if (!loading) {
                  event.currentTarget.style.background = colors.confirmHover;
                }
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = colors.confirmBg;
              }}
            >
              <span className="flex items-center justify-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {confirmLabel}
              </span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confirmDialogPopIn {
          from {
            opacity: 0;
            transform: translate(-50%, -48%) scale(0.94);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </>,
    document.body
  );
}
