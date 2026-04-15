"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckSquare } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChangeReq, FeedbackItem } from "./admin-shared";

/* ================================================================== */
/* RequestsFeedbackTab                                                 */
/* ================================================================== */
export default function RequestsFeedbackTab() {
  const [subTab, setSubTab] = useState<"requests" | "feedback">("requests");
  const [requests, setRequests] = useState<ChangeReq[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, fRes] = await Promise.all([
        fetch("/api/profile/change-requests"),
        fetch("/api/profile/feedback"),
      ]);
      if (rRes.ok) setRequests(await rRes.json());
      if (fRes.ok) setFeedbacks(await fRes.json());
    } catch (err) { console.warn("[RequestsFeedbackTab] Failed to fetch requests/feedback:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/profile/change-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) fetchAll();
    } catch (err) { console.warn("[RequestsFeedbackTab] Failed to handle action:", err); }
  };

  const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
    PENDING: { bg: "#fffbeb", color: "#d97706", border: "#fcd34d", label: "Chờ duyệt" },
    APPROVED: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0", label: "Đã duyệt" },
    REJECTED: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", label: "Từ chối" },
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab switcher */}
      <div style={{ display: "flex", gap: "4px" }}>
        {(["requests", "feedback"] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{
            padding: "6px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 500,
            border: "none", cursor: "pointer",
            background: subTab === t ? "#2563EB" : "#f3f4f6",
            color: subTab === t ? "#fff" : "#6b7280",
          }}>
            {t === "requests" ? `Yêu cầu thay đổi (${requests.filter(r => r.status === "PENDING").length})` : `Góp ý (${feedbacks.filter(f => !f.isRead).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center" }}>
          <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#9ca3af" }} />
        </div>
      ) : subTab === "requests" ? (
        /* Change Requests */
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {requests.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>Chưa có yêu cầu nào</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow style={{ background: "#f9fafb" }}>
                  <TableHead className="text-xs">Nhân viên</TableHead>
                  <TableHead className="text-xs">Thông tin</TableHead>
                  <TableHead className="text-xs">Giá trị cũ</TableHead>
                  <TableHead className="text-xs">Giá trị mới</TableHead>
                  <TableHead className="text-xs">Trạng thái</TableHead>
                  <TableHead className="text-xs">Ngày gửi</TableHead>
                  <TableHead className="text-xs w-[100px]">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map(r => {
                  const st = STATUS_STYLES[r.status];
                  return (
                    <TableRow key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <TableCell style={{ fontSize: "13px", fontWeight: 500 }}>{r.user.name}</TableCell>
                      <TableCell style={{ fontSize: "12px", color: "#6b7280" }}>{r.fieldLabel}</TableCell>
                      <TableCell style={{ fontSize: "12px", color: "#9ca3af" }}>{r.oldValue || "—"}</TableCell>
                      <TableCell style={{ fontSize: "12px", fontWeight: 500, color: "#2563EB" }}>{r.newValue}</TableCell>
                      <TableCell>
                        <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 500, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.label}</span>
                      </TableCell>
                      <TableCell style={{ fontSize: "11px", color: "#9ca3af" }}>{new Date(r.createdAt).toLocaleDateString("vi-VN")}</TableCell>
                      <TableCell>
                        {r.status === "PENDING" ? (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button onClick={() => handleAction(r.id, "approve")} style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: "#f0fdf4", color: "#16a34a", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#dcfce7"}
                              onMouseLeave={e => e.currentTarget.style.background = "#f0fdf4"}>
                              <CheckSquare className="w-3 h-3 inline mr-1" />Duyệt
                            </button>
                            <button onClick={() => handleAction(r.id, "reject")} style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: "#fef2f2", color: "#dc2626", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#fee2e2"}
                              onMouseLeave={e => e.currentTarget.style.background = "#fef2f2"}>
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: "#9ca3af" }}>{r.reviewedBy || "—"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      ) : (
        /* Feedback */
        <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          {feedbacks.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>Chưa có góp ý nào</div>
          ) : (
            feedbacks.map((f, i) => (
              <div key={f.id} style={{
                padding: "16px 20px",
                borderBottom: i < feedbacks.length - 1 ? "1px solid #f3f4f6" : "none",
                background: f.isRead ? "transparent" : "#fffbeb",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>{f.userName}</span>
                    {!f.isRead && (
                      <span style={{ padding: "1px 6px", borderRadius: "8px", fontSize: "10px", background: "#d97706", color: "#fff" }}>Mới</span>
                    )}
                  </div>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>{new Date(f.createdAt).toLocaleDateString("vi-VN")}</span>
                </div>
                <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{f.content}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
