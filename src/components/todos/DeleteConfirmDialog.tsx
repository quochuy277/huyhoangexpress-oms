"use client";

import { createPortal } from "react-dom";
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";

interface DeleteConfirmDialogProps {
  title: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteConfirmDialog({ title, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await onConfirm();
    } finally {
      setDeleting(false);
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10100] bg-black/50 backdrop-blur-[2px]"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10101] w-[400px] max-w-[calc(100vw-32px)] bg-white rounded-2xl border-[1.5px] border-red-200 shadow-2xl p-7 animate-[confirmPopIn_0.2s_ease-out]">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4 border-2 border-red-200">
            <Trash2 size={22} className="text-red-600" />
          </div>
          <div className="text-base font-bold text-slate-800 mb-2">Xóa công việc?</div>
          <div className="text-[13px] text-gray-500 mb-1.5 leading-relaxed">
            Hành động này không thể hoàn tác. Công việc sau sẽ bị xóa vĩnh viễn:
          </div>
          <div className="text-[13px] font-semibold text-red-600 bg-red-50 px-3.5 py-2 rounded-lg mb-5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
            &quot;{title}&quot;
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-[10px] border-[1.5px] border-gray-300 bg-white text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-[10px] border-none bg-red-600 text-sm font-semibold text-white cursor-pointer hover:bg-red-700 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? "Đang xóa..." : "Xóa"}
          </button>
        </div>
      </div>
      <style>{`@keyframes confirmPopIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.9) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }`}</style>
    </>,
    document.body
  );
}
