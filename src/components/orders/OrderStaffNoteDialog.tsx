"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, NotebookPen } from "lucide-react";

import { getOrderStaffNoteDialogClassNames } from "@/components/orders/ordersResponsive";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OrderRow } from "@/types/orders";

type SaveState = "idle" | "saving" | "success" | "error";

interface OrderStaffNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Pick<OrderRow, "requestCode" | "shopName" | "receiverName" | "staffNotes"> | null;
  canEditStaffNotes: boolean;
  onSaved: (staffNotes: string | null) => void;
}

function normalizeNote(note: string | null | undefined) {
  const trimmed = note?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "";
}

export function OrderStaffNoteDialog({
  open,
  onOpenChange,
  order,
  canEditStaffNotes,
  onSaved,
}: OrderStaffNoteDialogProps) {
  const classes = getOrderStaffNoteDialogClassNames();
  const closeTimerRef = useRef<number | null>(null);
  const [note, setNote] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialNote = useMemo(() => normalizeNote(order?.staffNotes), [order?.staffNotes]);

  useEffect(() => {
    setNote(initialNote);
    setSaveState("idle");
    setErrorMessage(null);
  }, [initialNote, order?.requestCode, open]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    if (!order || saveState === "saving") return;

    const normalizedNote = normalizeNote(note);
    if (normalizedNote === initialNote) {
      handleOpenChange(false);
      return;
    }

    setSaveState("saving");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/orders/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestCode: order.requestCode,
          staffNotes: normalizedNote.length > 0 ? normalizedNote : null,
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          typeof payload?.error === "string" ? payload.error : "Không thể lưu ghi chú nội bộ.",
        );
      }

      const savedNote = normalizeNote(payload?.staffNotes);
      onSaved(savedNote.length > 0 ? savedNote : null);
      setSaveState("success");
      closeTimerRef.current = window.setTimeout(() => {
        handleOpenChange(false);
      }, 450);
    } catch (error) {
      setSaveState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể lưu ghi chú nội bộ.",
      );
    }
  };

  const statusTone =
    saveState === "error"
      ? "text-red-600"
      : saveState === "success"
        ? "text-emerald-600"
        : "text-slate-500";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={classes.content}>
        <DialogHeader className={classes.header}>
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold text-slate-900">
            <div className="rounded-lg bg-blue-50 p-2">
              <NotebookPen className="h-5 w-5 text-blue-600" />
            </div>
            Ghi chú nội bộ
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            {canEditStaffNotes
              ? "Cập nhật ghi chú để đội vận hành theo dõi đơn hàng mà không làm giãn chiều cao của bảng."
              : "Bạn đang ở chế độ chỉ xem. Nội dung ghi chú vẫn hiển thị đầy đủ nhưng không thể chỉnh sửa."}
          </DialogDescription>
        </DialogHeader>

        <div className={classes.body}>
          <div className={classes.metaGrid}>
            <div className={classes.metaItem}>
              <div className={classes.metaLabel}>Mã yêu cầu</div>
              <div className={classes.metaValue}>{order?.requestCode ?? "—"}</div>
            </div>
            <div className={classes.metaItem}>
              <div className={classes.metaLabel}>Tên cửa hàng</div>
              <div className={classes.metaValue}>{order?.shopName?.trim() || "—"}</div>
            </div>
            <div className={classes.metaItem}>
              <div className={classes.metaLabel}>Người nhận</div>
              <div className={classes.metaValue}>{order?.receiverName?.trim() || "—"}</div>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="order-staff-note-textarea"
              className="text-sm font-semibold text-slate-700"
            >
              Ghi chú nội bộ
            </label>
            <textarea
              id="order-staff-note-textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={!canEditStaffNotes || saveState === "saving"}
              className={classes.textarea}
              placeholder={
                canEditStaffNotes
                  ? "Nhập ghi chú nội bộ cho đơn hàng này..."
                  : "Không có ghi chú nội bộ."
              }
            />
          </div>
        </div>

        <DialogFooter className={classes.footer}>
          <div className={`flex items-center gap-2 ${classes.status} ${statusTone}`}>
            {saveState === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
            {saveState === "success" && <CheckCircle2 className="h-4 w-4" />}
            {saveState === "error" && <AlertCircle className="h-4 w-4" />}
            <span>
              {saveState === "saving" && "Đang lưu ghi chú..."}
              {saveState === "success" && "Đã lưu ghi chú."}
              {saveState === "error" && (errorMessage ?? "Không thể lưu ghi chú nội bộ.")}
              {saveState === "idle" &&
                (canEditStaffNotes
                  ? "Ghi chú được lưu trực tiếp vào đơn hàng."
                  : "Đóng để quay lại danh sách đơn hàng.")}
            </span>
          </div>

          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Đóng
            </button>
            {canEditStaffNotes && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState === "saving"}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveState === "saving" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu
                  </>
                ) : (
                  "Lưu ghi chú"
                )}
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
