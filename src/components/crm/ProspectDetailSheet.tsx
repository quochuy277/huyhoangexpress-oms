"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  X, Loader2, Phone, MessageSquare, Mail, Handshake,
  Settings, FileText, PackageX, RotateCcw, Send, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProspectDetailSheetProps {
  prospectId: string;
  userId: string;
  userName: string;
  onClose: () => void;
  onMarkLost: (id: string, reason: string) => void;
  onReopen: (id: string) => void;
}

const STAGES = [
  { key: "DISCOVERED", label: "Mới phát hiện", emoji: "🔍" },
  { key: "CONTACTED", label: "Đã tiếp cận", emoji: "📞" },
  { key: "NEGOTIATING", label: "Đang thương lượng", emoji: "🤝" },
  { key: "TRIAL", label: "Dùng thử", emoji: "🧪" },
  { key: "CONVERTED", label: "Đã chuyển đổi", emoji: "✅" },
];

const SOURCE_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook", SHOPEE: "Shopee", TIKTOK_SHOP: "TikTok Shop",
  REFERRAL: "Giới thiệu", DIRECT: "Trực tiếp", LANDING_PAGE: "Landing Page", OTHER: "Khác",
};

const SIZE_LABELS: Record<string, string> = {
  SMALL: "Nhỏ", MEDIUM: "Trung bình", LARGE: "Lớn",
};

const CONTACT_ICONS: Record<string, React.ReactNode> = {
  PHONE_CALL: <Phone className="w-3.5 h-3.5" />,
  MESSAGE: <MessageSquare className="w-3.5 h-3.5" />,
  EMAIL: <Mail className="w-3.5 h-3.5" />,
  IN_PERSON: <Handshake className="w-3.5 h-3.5" />,
  SYSTEM: <Settings className="w-3.5 h-3.5" />,
  OTHER: <FileText className="w-3.5 h-3.5" />,
};

const METHODS = [
  { value: "PHONE_CALL", label: "Gọi điện" },
  { value: "MESSAGE", label: "Nhắn tin" },
  { value: "EMAIL", label: "Email" },
  { value: "IN_PERSON", label: "Gặp trực tiếp" },
  { value: "OTHER", label: "Khác" },
];

const RESULTS = [
  { value: "", label: "— Chọn —" },
  { value: "RESOLVED", label: "Tích cực" },
  { value: "IN_PROGRESS", label: "Đang tiến triển" },
  { value: "WAITING", label: "Chờ phản hồi" },
  { value: "UNSATISFIED", label: "Tiêu cực" },
];

function formatDate(date: string | Date | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ProspectDetailSheet({ prospectId, userId, userName, onClose, onMarkLost, onReopen }: ProspectDetailSheetProps) {
  const queryClient = useQueryClient();
  const [showLostInput, setShowLostInput] = useState(false);
  const [lostReason, setLostReason] = useState("");

  // Contact log form
  const [contactMethod, setContactMethod] = useState("PHONE_CALL");
  const [contactContent, setContactContent] = useState("");
  const [contactResult, setContactResult] = useState("");
  const [contactFollowUp, setContactFollowUp] = useState("");
  const [sendingLog, setSendingLog] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["crm-prospect-detail", prospectId],
    queryFn: async () => {
      const res = await fetch(`/api/crm/prospects/${prospectId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const prospect = data?.data;

  const handleStageChange = async (stage: string) => {
    await fetch(`/api/crm/prospects/${prospectId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    refetch();
    queryClient.invalidateQueries({ queryKey: ["crm-prospects"] });
    queryClient.invalidateQueries({ queryKey: ["crm-prospect-stats"] });
  };

  const handleSubmitLog = async () => {
    if (!contactContent.trim()) return;
    setSendingLog(true);
    try {
      await fetch(`/api/crm/prospects/${prospectId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactMethod,
          content: contactContent.trim(),
          result: contactResult || null,
          followUpDate: contactFollowUp || null,
        }),
      });
      setContactContent("");
      setContactResult("");
      setContactFollowUp("");
      refetch();
    } catch {
      alert("Lỗi khi ghi nhận");
    } finally {
      setSendingLog(false);
    }
  };

  const handleLost = () => {
    onMarkLost(prospectId, lostReason);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{prospect?.shopName || "..."}</h2>
            {prospect && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">{SOURCE_LABELS[prospect.source] || prospect.source}</span>
                {prospect.isLost && <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">ĐÃ MẤT</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : !prospect ? (
            <p className="text-center text-slate-400 py-20">Không tìm thấy</p>
          ) : (
            <>
              {/* Stage Progress */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Giai đoạn</h3>
                <div className="flex gap-1">
                  {STAGES.map((s) => {
                    const isActive = s.key === prospect.stage;
                    const stageIdx = STAGES.findIndex((st) => st.key === prospect.stage);
                    const thisIdx = STAGES.findIndex((st) => st.key === s.key);
                    const isPast = thisIdx < stageIdx;
                    return (
                      <button
                        key={s.key}
                        onClick={() => !prospect.isLost && handleStageChange(s.key)}
                        disabled={prospect.isLost}
                        className={cn(
                          "flex-1 text-center py-2 rounded-lg text-xs font-medium transition-all border",
                          isActive
                            ? "bg-blue-600 text-white border-blue-600 scale-105 shadow-sm"
                            : isPast
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100",
                          prospect.isLost && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {s.emoji}
                        <span className="hidden sm:inline ml-1">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Profile Info */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Thông tin</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-slate-400">SĐT:</span> <span className="text-slate-700">{prospect.phone || "—"}</span></div>
                  <div><span className="text-slate-400">Email:</span> <span className="text-slate-700">{prospect.email || "—"}</span></div>
                  <div><span className="text-slate-400">Liên hệ:</span> <span className="text-slate-700">{prospect.contactPerson || "—"}</span></div>
                  <div><span className="text-slate-400">Zalo:</span> <span className="text-slate-700">{prospect.zalo || "—"}</span></div>
                  <div><span className="text-slate-400">Loại hàng:</span> <span className="text-slate-700">{prospect.productType || "—"}</span></div>
                  <div><span className="text-slate-400">Quy mô:</span> <span className="text-slate-700">{prospect.estimatedSize ? SIZE_LABELS[prospect.estimatedSize] : "—"}</span></div>
                  <div><span className="text-slate-400">ĐT hiện tại:</span> <span className="text-slate-700">{prospect.currentCarrier || "—"}</span></div>
                  <div><span className="text-slate-400">NV:</span> <span className="text-slate-700">{prospect.assignee?.name || "—"}</span></div>
                  <div className="col-span-2"><span className="text-slate-400">Địa chỉ:</span> <span className="text-slate-700">{prospect.address || "—"}</span></div>
                </div>
                {prospect.note && (
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-lg text-sm text-slate-600">{prospect.note}</div>
                )}
              </div>

              {/* Add Contact Log */}
              {!prospect.isLost && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="text-xs font-semibold text-blue-700 uppercase mb-3">Ghi nhận liên hệ</h3>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select value={contactMethod} onChange={(e) => setContactMethod(e.target.value)}
                        className="border border-blue-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                        {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                      <select value={contactResult} onChange={(e) => setContactResult(e.target.value)}
                        className="border border-blue-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                        {RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <input type="date" value={contactFollowUp} onChange={(e) => setContactFollowUp(e.target.value)}
                        className="border border-blue-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        title="Ngày nhắc lại" />
                    </div>
                    <div className="flex gap-2">
                      <textarea value={contactContent} onChange={(e) => setContactContent(e.target.value)}
                        rows={2} placeholder="Nội dung trao đổi..."
                        className="flex-1 border border-blue-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                      <button onClick={handleSubmitLog} disabled={!contactContent.trim() || sendingLog}
                        className="self-end px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                        {sendingLog ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Gửi
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Timeline */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Lịch sử liên hệ</h3>
                {prospect.contactLogs?.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Chưa có lịch sử liên hệ</p>
                ) : (
                  <div className="space-y-3 ml-4 border-l-2 border-slate-200 pl-4">
                    {prospect.contactLogs?.map((log: {
                      id: string; contactMethod: string; content: string;
                      result: string | null; authorName: string; createdAt: string; followUpDate: string | null;
                    }) => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-300" />
                        <div className="text-sm">
                          <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
                            {CONTACT_ICONS[log.contactMethod]}
                            <span className="font-medium text-slate-600">{log.authorName}</span>
                            <span>{formatDate(log.createdAt)}</span>
                          </div>
                          <p className="text-slate-700">{log.content}</p>
                          {log.result && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 mt-1 inline-block">
                              {log.result}
                            </span>
                          )}
                          {log.followUpDate && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-700 mt-1 ml-1 inline-block">
                              <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                              Nhắc: {new Date(log.followUpDate).toLocaleDateString("vi-VN")}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                {!prospect.isLost ? (
                  <>
                    {!showLostInput ? (
                      <button onClick={() => setShowLostInput(true)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                        <PackageX className="w-3.5 h-3.5" /> Đánh dấu mất
                      </button>
                    ) : (
                      <div className="flex-1 flex gap-2">
                        <input value={lostReason} onChange={(e) => setLostReason(e.target.value)}
                          placeholder="Lý do mất..."
                          className="flex-1 border border-red-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
                        <button onClick={handleLost}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Xác nhận</button>
                        <button onClick={() => setShowLostInput(false)}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Hủy</button>
                      </div>
                    )}
                  </>
                ) : (
                  <button onClick={() => { onReopen(prospectId); onClose(); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> Mở lại Prospect
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
