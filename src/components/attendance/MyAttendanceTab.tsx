"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Activity, Calendar, Clock, ChevronLeft, ChevronRight, Monitor,
  AlertTriangle, FileText, Loader2, Plus, X, Check,
} from "lucide-react";

const cardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px 20px" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", outline: "none" };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PRESENT: { label: "Đủ công", color: "#16a34a", bg: "#dcfce7" },
  HALF_DAY: { label: "Nửa ngày", color: "#d97706", bg: "#fef3c7" },
  ABSENT: { label: "Vắng", color: "#dc2626", bg: "#fee2e2" },
  ON_LEAVE: { label: "Nghỉ phép", color: "#2563EB", bg: "#dbeafe" },
  UNAPPROVED_LEAVE: { label: "Nghỉ KP", color: "#6b7280", bg: "#f3f4f6" },
};

const LEAVE_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Chờ duyệt", color: "#d97706", bg: "#fef3c7" },
  APPROVED: { label: "Đã duyệt", color: "#16a34a", bg: "#dcfce7" },
  REJECTED: { label: "Từ chối", color: "#dc2626", bg: "#fee2e2" },
};

const LOGOUT_REASONS: Record<string, string> = {
  manual: "Thủ công",
  auto_midnight: "Auto (0h)",
  idle_timeout: "Không hoạt động",
  session_expired: "Hết phiên",
};

interface Props {
  userId: string;
  userName: string;
}

export default function MyAttendanceTab({ userId, userName }: Props) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [attendance, setAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [liveMinutes, setLiveMinutes] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, histRes, leaveRes] = await Promise.all([
        fetch(`/api/attendance/me?month=${month}`).then(r => r.json()),
        fetch(`/api/login-history/me?month=${month}&page=${historyPage}&pageSize=20`).then(r => r.json()),
        fetch("/api/leave-requests").then(r => r.json()),
      ]);
      setAttendance(attRes.attendance || []);
      setStats(attRes.stats || null);
      setLoginHistory(histRes.records || []);
      setHistoryTotal(histRes.pagination?.total || 0);
      setLeaveRequests(leaveRes.requests || []);

      // Find active session (no logoutTime)
      const active = (histRes.records || []).find((r: any) => !r.logoutTime);
      setCurrentSession(active || null);
    } finally {
      setLoading(false);
    }
  }, [month, historyPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Live timer for current session
  useEffect(() => {
    if (!currentSession) return;
    const update = () => {
      const mins = Math.floor((Date.now() - new Date(currentSession.loginTime).getTime()) / 60000);
      setLiveMinutes(mins);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [currentSession]);

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m.toString().padStart(2, "0")}p`;
  };

  const todayAttendance = attendance.find(a => {
    const d = new Date(a.date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const todayTotalMinutes = (todayAttendance?.totalMinutes || 0) + (currentSession && !currentSession.logoutTime ? liveMinutes : 0);
  const todayHours = todayTotalMinutes / 60;

  const handleLeaveSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLeaveLoading(true);
    try {
      await fetch("/api/leave-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateFrom: fd.get("dateFrom"),
          dateTo: fd.get("dateTo"),
          reason: fd.get("reason"),
        }),
      });
      setShowLeaveForm(false);
      fetchData();
    } finally {
      setLeaveLoading(false);
    }
  };

  // Calendar
  const [calYear, calMonth] = month.split("-").map(Number);
  const firstDay = new Date(calYear, calMonth - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const calDays: (number | null)[] = Array(firstDay === 0 ? 6 : firstDay - 1).fill(null);
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i);
  while (calDays.length % 7 !== 0) calDays.push(null);

  const getAttendanceForDay = (day: number) => {
    return attendance.find(a => new Date(a.date).getDate() === day);
  };

  const prevMonth = () => {
    const d = new Date(calYear, calMonth - 2, 1);
    setMonth(format(d, "yyyy-MM"));
  };
  const nextMonth = () => {
    const d = new Date(calYear, calMonth, 1);
    setMonth(format(d, "yyyy-MM"));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Section A: Current Status */}
      <div style={{ ...cardStyle, background: currentSession ? "linear-gradient(135deg, #f0fdf4, #ecfdf5)" : "#fff", border: currentSession ? "1.5px solid #86efac" : "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "10px", height: "10px", borderRadius: "50%",
              background: currentSession ? "#22c55e" : "#d1d5db",
              boxShadow: currentSession ? "0 0 8px #22c55e" : "none",
              animation: currentSession ? "pulse 2s infinite" : "none",
            }} />
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
              {currentSession
                ? `Đang online từ ${format(new Date(currentSession.loginTime), "HH:mm")}`
                : "Không có phiên đang hoạt động"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "20px", fontSize: "13px", color: "#475569" }}>
            <span>Tổng hôm nay: <strong style={{ color: todayHours >= 4 ? "#16a34a" : todayHours >= 2 ? "#d97706" : "#dc2626" }}>{formatDuration(todayTotalMinutes)}</strong></span>
            <span>Trạng thái: <strong style={{ color: todayHours >= 4 ? "#16a34a" : todayHours >= 2 ? "#d97706" : "#dc2626" }}>
              {todayHours >= 4 ? "Đủ công" : todayHours >= 2 ? "Nửa ngày" : "Chưa đủ công"}
            </strong></span>
          </div>
        </div>
        {currentSession && (
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#6b7280", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <span>IP: {currentSession.ipAddress || "—"}</span>
            <span>Thiết bị: {currentSession.deviceType || "—"}</span>
            {todayAttendance?.isLate && (
              <span style={{ color: "#d97706", fontWeight: 600 }}>⚠ Đi muộn {todayAttendance.lateMinutes} phút</span>
            )}
          </div>
        )}
      </div>

      {/* Section B: Calendar + Section D: Stats */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {/* Calendar */}
        <div style={{ ...cardStyle, flex: "2 1 400px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><ChevronLeft size={18} /></button>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
              Tháng {calMonth}/{calYear}
            </span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><ChevronRight size={18} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", textAlign: "center" }}>
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
              <div key={d} style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", padding: "4px" }}>{d}</div>
            ))}
            {calDays.map((day, i) => {
              if (!day) return <div key={`e${i}`} />;
              const att = getAttendanceForDay(day);
              const isToday = new Date().getDate() === day && new Date().getMonth() + 1 === calMonth && new Date().getFullYear() === calYear;
              const isFuture = new Date(calYear, calMonth - 1, day) > new Date();
              const cfg = att ? STATUS_CONFIG[att.status] : null;
              return (
                <div key={day} style={{
                  padding: "6px 2px", borderRadius: "8px", fontSize: "12px", position: "relative",
                  background: isToday ? "#eff6ff" : cfg ? cfg.bg + "60" : isFuture ? "#f9fafb" : "#fff",
                  border: isToday ? "1.5px solid #2563EB" : "1px solid #f1f5f9",
                  cursor: att ? "pointer" : "default",
                }}>
                  <div style={{ fontWeight: isToday ? 700 : 500, color: cfg ? cfg.color : "#9ca3af" }}>{day}</div>
                  {att && (
                    <div style={{ fontSize: "9px", color: cfg?.color, fontWeight: 500, marginTop: "1px" }}>
                      {formatDuration(att.totalMinutes)}
                    </div>
                  )}
                  {att?.isLate && <span style={{ position: "absolute", top: "1px", right: "3px", fontSize: "8px" }}>⚠</span>}
                  {att?.isManualEdit && <span style={{ position: "absolute", top: "1px", left: "3px", fontSize: "8px" }}>✏️</span>}
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: "12px", marginTop: "10px", flexWrap: "wrap", justifyContent: "center" }}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: v.color }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: v.color }} />{v.label}
              </div>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: "1 1 200px" }}>
          {[
            { label: "Tổng ngày công", value: stats ? `${stats.equivalent}` : "—", sub: `${stats?.present || 0} + 0.5×${stats?.halfDay || 0}`, color: "#16a34a", bg: "#f0fdf4" },
            { label: "Tổng giờ online", value: stats ? formatDuration(stats.totalMinutes) : "—", sub: "", color: "#2563EB", bg: "#eff6ff" },
            { label: "Số lần đi muộn", value: stats?.lateCount ?? "—", sub: "", color: "#d97706", bg: "#fffbeb" },
            { label: "Ngày vắng", value: stats?.absent ?? "—", sub: "", color: "#dc2626", bg: "#fef2f2" },
          ].map((s, i) => (
            <div key={i} style={{ ...cardStyle, background: s.bg, borderColor: s.color + "30" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: s.color, marginTop: "2px" }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: "10px", color: "#9ca3af" }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Section C: Login History */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
            <Monitor size={16} color="#2563EB" /> Lịch sử đăng nhập
          </div>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...inputStyle, width: "auto", padding: "6px 10px", fontSize: "12px" }} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb" }}>
                {["#", "Ngày", "Đăng Nhập", "Đăng Xuất", "Thời Gian", "Thiết Bị", "IP", "Lý Do Xuất"].map(h => (
                  <th key={h} style={{ padding: "8px 8px", textAlign: "left", fontWeight: 600, color: "#475569" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "24px" }}><Loader2 className="animate-spin inline" size={18} /></td></tr>
              ) : loginHistory.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "#9ca3af" }}>Chưa có lịch sử</td></tr>
              ) : loginHistory.map((r: any, i: number) => {
                const late = todayAttendance?.isLate && new Date(r.loginTime).toDateString() === new Date().toDateString();
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                    <td style={{ padding: "7px 8px", color: "#9ca3af" }}>{(historyPage - 1) * 20 + i + 1}</td>
                    <td style={{ padding: "7px 8px", fontWeight: 500 }}>{format(new Date(r.loginTime), "dd/MM/yyyy")}</td>
                    <td style={{ padding: "7px 8px" }}>
                      {format(new Date(r.loginTime), "HH:mm")}
                      {late && <span style={{ color: "#d97706", marginLeft: "4px" }}>⚠</span>}
                    </td>
                    <td style={{ padding: "7px 8px" }}>{r.logoutTime ? format(new Date(r.logoutTime), "HH:mm") : <span style={{ color: "#22c55e", fontWeight: 600 }}>Online</span>}</td>
                    <td style={{ padding: "7px 8px", fontWeight: 500 }}>{r.duration != null ? formatDuration(r.duration) : "—"}</td>
                    <td style={{ padding: "7px 8px", color: "#6b7280" }}>{r.deviceType || "—"}</td>
                    <td style={{ padding: "7px 8px", color: "#6b7280", fontSize: "11px" }}>{r.ipAddress || "—"}</td>
                    <td style={{ padding: "7px 8px" }}>
                      {r.logoutReason ? (
                        <span style={{
                          fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 500,
                          background: r.logoutReason === "manual" ? "#f3f4f6" : r.logoutReason === "idle_timeout" ? "#fef3c7" : "#dbeafe",
                          color: r.logoutReason === "manual" ? "#4b5563" : r.logoutReason === "idle_timeout" ? "#92400e" : "#1e40af",
                        }}>
                          {LOGOUT_REASONS[r.logoutReason] || r.logoutReason}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {historyTotal > 20 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "10px" }}>
            <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage <= 1} style={{ padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", cursor: "pointer", opacity: historyPage <= 1 ? 0.4 : 1 }}>← Trước</button>
            <span style={{ fontSize: "12px", color: "#6b7280", lineHeight: "28px" }}>Trang {historyPage}</span>
            <button onClick={() => setHistoryPage(p => p + 1)} disabled={historyPage * 20 >= historyTotal} style={{ padding: "4px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", cursor: "pointer", opacity: historyPage * 20 >= historyTotal ? 0.4 : 1 }}>Sau →</button>
          </div>
        )}
      </div>

      {/* Section E: Leave Requests */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
            <FileText size={16} color="#2563EB" /> Xin nghỉ phép
          </div>
          <button onClick={() => setShowLeaveForm(true)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
            <Plus size={13} /> Xin nghỉ phép
          </button>
        </div>

        {showLeaveForm && (
          <form onSubmit={handleLeaveSubmit} style={{ background: "#f8fafc", borderRadius: "10px", padding: "16px", marginBottom: "12px", border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "10px" }}>
              <div style={{ flex: "1 1 150px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "3px" }}>Từ ngày *</label>
                <input name="dateFrom" type="date" required style={inputStyle} />
              </div>
              <div style={{ flex: "1 1 150px" }}>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "3px" }}>Đến ngày *</label>
                <input name="dateTo" type="date" required style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "3px" }}>Lý do *</label>
              <textarea name="reason" required rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Nhập lý do nghỉ phép..." />
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowLeaveForm(false)} style={{ padding: "7px 14px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", fontSize: "12px", cursor: "pointer" }}>Hủy</button>
              <button type="submit" disabled={leaveLoading} style={{ padding: "7px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer", opacity: leaveLoading ? 0.6 : 1 }}>
                {leaveLoading ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
            </div>
          </form>
        )}

        {leaveRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af", fontSize: "12px" }}>Chưa có yêu cầu nghỉ phép</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                  {["Từ Ngày", "Đến Ngày", "Số Ngày", "Lý Do", "Trạng Thái", "Ghi Chú"].map(h => (
                    <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 600, color: "#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((r: any) => {
                  const cfg = LEAVE_STATUS[r.leaveStatus] || LEAVE_STATUS.PENDING;
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "7px 8px" }}>{format(new Date(r.dateFrom), "dd/MM/yyyy")}</td>
                      <td style={{ padding: "7px 8px" }}>{format(new Date(r.dateTo), "dd/MM/yyyy")}</td>
                      <td style={{ padding: "7px 8px", fontWeight: 600 }}>{r.totalDays}</td>
                      <td style={{ padding: "7px 8px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason}</td>
                      <td style={{ padding: "7px 8px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 600, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </td>
                      <td style={{ padding: "7px 8px", color: "#6b7280", fontSize: "11px" }}>
                        {r.leaveStatus === "APPROVED" && r.approvedBy && `Duyệt: ${r.approvedBy}`}
                        {r.leaveStatus === "REJECTED" && r.rejectReason && `Lý do: ${r.rejectReason}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  );
}
