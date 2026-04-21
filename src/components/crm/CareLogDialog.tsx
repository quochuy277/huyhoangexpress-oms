"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CareLogDialogProps {
  shopName: string;
  userId: string;
  userName: string;
  onClose: () => void;
}

const METHODS = [
  { value: "PHONE_CALL", label: "Gọi điện" },
  { value: "MESSAGE", label: "Nhắn tin/Zalo" },
  { value: "EMAIL", label: "Email" },
  { value: "IN_PERSON", label: "Gặp trực tiếp" },
  { value: "OTHER", label: "Khác" },
];

const RESULTS = [
  { value: "", label: "— Chọn kết quả —" },
  { value: "RESOLVED", label: "Đã giải quyết" },
  { value: "IN_PROGRESS", label: "Đang xử lý" },
  { value: "WAITING", label: "Chờ phản hồi" },
  { value: "UNSATISFIED", label: "KH không hài lòng" },
  { value: "OTHER", label: "Khác" },
];

export function CareLogDialog({ shopName, userId, userName, onClose }: CareLogDialogProps) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [contactMethod, setContactMethod] = useState("PHONE_CALL");
  const [content, setContent] = useState("");
  const [result, setResult] = useState("");
  const [relatedOrderId, setRelatedOrderId] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/crm/shops/${encodeURIComponent(shopName)}/care`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactMethod,
          content: content.trim(),
          result: result || null,
          relatedOrderId: relatedOrderId.trim() || null,
          followUpDate: followUpDate || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      queryClient.invalidateQueries({ queryKey: ["crm-shop-detail"] });
      queryClient.invalidateQueries({ queryKey: ["crm-dashboard"] });
      onClose();
    } catch {
      toast.error("Lỗi khi lưu ghi nhận chăm sóc");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-xl border-[1.5px] border-blue-600 shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-800">Thêm ghi nhận chăm sóc — {shopName}</h3>
            <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Hình thức *</label>
              <select value={contactMethod} onChange={(e) => setContactMethod(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nội dung *</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)}
                rows={4} placeholder="Mô tả nội dung trao đổi..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Kết quả</label>
              <select value={result} onChange={(e) => setResult(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Đơn liên quan</label>
              <input value={relatedOrderId} onChange={(e) => setRelatedOrderId(e.target.value)}
                placeholder="Mã yêu cầu (optional)" type="text"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nhắc lại sau</label>
              <input value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)}
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              Hủy
            </button>
            <button onClick={handleSave} disabled={!content.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Lưu
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
