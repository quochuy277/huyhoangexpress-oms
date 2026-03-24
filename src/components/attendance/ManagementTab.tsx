"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Settings, Users, FileText, Loader2, Check, X, Eye,
  ChevronLeft, ChevronRight, Download, Save,
} from "lucide-react";

const cardStyle: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px 20px" };
const inputStyle: React.CSSProperties = { padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", outline: "none" };
const btnPrimary: React.CSSProperties = { display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "8px", border: "none", background: "#2563EB", color: "#fff", fontSize: "12px", fontWeight: 600, cursor: "pointer" };

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

interface Props { canEdit: boolean }

export default function ManagementTab({ canEdit }: Props) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [settings, setSettings] = useState<any>({});
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [detailUser, setDetailUser] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [editDialog, setEditDialog] = useState<any>(null);
  const [rejectDialog, setRejectDialog] = useState<any>(null);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/settings/attendance");
      setSettings(await res.json());
    } finally { setSettingsLoading(false); }
  }, []);

  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    try {
      const res = await fetch(`/api/attendance/team?month=${month}`);
      const data = await res.json();
      setTeam(data.team || []);
    } finally { setTeamLoading(false); }
  }, [month]);

  const fetchLeave = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const res = await fetch("/api/leave-requests/all");
      const data = await res.json();
      setLeaveRequests(data.requests || []);
      setPendingCount(data.pendingCount || 0);
    } finally { setLeaveLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); fetchLeave(); }, [fetchSettings, fetchLeave]);
  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await fetch("/api/settings/attendance", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } finally { setSettingsSaving(false); }
  };

  const openDetail = async (userId: string) => {
    const res = await fetch(`/api/attendance/user/${userId}?month=${month}`);
    const data = await res.json();
    setDetailUser(data.user);
    setDetailData(data);
  };

  const handleEditSave = async () => {
    if (!editDialog) return;
    await fetch(`/api/attendance/${editDialog.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: editDialog.newStatus, editNote: editDialog.note }),
    });
    setEditDialog(null);
    fetchTeam();
    if (detailUser) openDetail(detailUser.id);
  };

  const handleApprove = async (id: string) => {
    await fetch(`/api/leave-requests/${id}/approve`, { method: "PATCH" });
    fetchLeave();
    fetchTeam();
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    await fetch(`/api/leave-requests/${rejectDialog.id}/reject`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectReason: rejectDialog.reason }),
    });
    setRejectDialog(null);
    fetchLeave();
  };

  const handleExport = () => {
    window.open(`/api/attendance/export?month=${month}`, "_blank");
  };

  const formatDuration = (mins: number) => `${Math.floor(mins / 60)}h ${(mins % 60).toString().padStart(2, "0")}p`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Section A: Settings */}
      {canEdit && (
        <div style={cardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "14px" }}>
            <Settings size={16} color="#2563EB" /> Cài đặt chấm công
          </div>
          {settingsLoading ? <Loader2 className="animate-spin" size={18} /> : (
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "3px" }}>Giờ đi muộn</label>
                <input type="time" value={settings.late_time || "08:30"} onChange={e => setSettings((s: any) => ({ ...s, late_time: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "3px" }}>Auto-logout đêm</label>
                <input type="time" value={settings.auto_logout || "00:00"} onChange={e => setSettings((s: any) => ({ ...s, auto_logout: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "3px" }}>Đủ công (giờ)</label>
                <input type="number" value={settings.full_day_hours || "4"} min={1} max={24} onChange={e => setSettings((s: any) => ({ ...s, full_day_hours: e.target.value }))} style={{ ...inputStyle, width: "70px" }} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "3px" }}>Nửa ngày (giờ)</label>
                <input type="number" value={settings.half_day_hours || "2"} min={1} max={24} onChange={e => setSettings((s: any) => ({ ...s, half_day_hours: e.target.value }))} style={{ ...inputStyle, width: "70px" }} />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "3px" }}>Idle timeout (phút)</label>
                <input type="number" value={settings.idle_timeout || "60"} min={15} max={480} onChange={e => setSettings((s: any) => ({ ...s, idle_timeout: e.target.value }))} style={{ ...inputStyle, width: "80px" }} />
              </div>
              <button onClick={saveSettings} disabled={settingsSaving} style={btnPrimary}>
                {settingsSaving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />} Lưu
              </button>
            </div>
          )}
        </div>
      )}

      {/* Section B: Team Overview */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
            <Users size={16} color="#2563EB" /> Tổng hợp nhân viên
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ ...inputStyle, fontSize: "12px" }} />
            <button onClick={handleExport} style={{ ...btnPrimary, background: "#16a34a" }}><Download size={13} /> Excel</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb" }}>
                {["#", "Nhân Viên", "Ngày Công", "Nửa Ngày", "Quy Đổi", "Vắng", "Nghỉ Phép", "Đi Muộn", "Tổng Giờ", "TB Giờ/Ngày", ""].map(h => (
                  <th key={h} style={{ padding: "8px 8px", textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamLoading ? (
                <tr><td colSpan={11} style={{ textAlign: "center", padding: "30px" }}><Loader2 className="animate-spin inline" size={18} /></td></tr>
              ) : team.map((t: any, i: number) => (
                <tr key={t.user.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                  <td style={{ padding: "7px 8px", color: "#9ca3af" }}>{i + 1}</td>
                  <td style={{ padding: "7px 8px", fontWeight: 600, color: "#1e293b" }}>{t.user.name}</td>
                  <td style={{ padding: "7px 8px", fontWeight: 600, color: "#16a34a" }}>{t.stats.present}</td>
                  <td style={{ padding: "7px 8px", color: "#d97706" }}>{t.stats.halfDay}</td>
                  <td style={{ padding: "7px 8px", fontWeight: 700, color: "#2563EB" }}>{t.stats.equivalent}</td>
                  <td style={{ padding: "7px 8px", color: "#dc2626" }}>{t.stats.absent}</td>
                  <td style={{ padding: "7px 8px", color: "#2563EB" }}>{t.stats.onLeave}</td>
                  <td style={{ padding: "7px 8px", color: "#d97706" }}>{t.stats.lateCount}</td>
                  <td style={{ padding: "7px 8px", fontWeight: 500 }}>{t.stats.totalHours}h</td>
                  <td style={{ padding: "7px 8px", color: "#6b7280" }}>{t.stats.avgHoursPerDay}h</td>
                  <td style={{ padding: "7px 8px" }}>
                    <button onClick={() => openDetail(t.user.id)} style={{ fontSize: "11px", color: "#2563EB", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>
                      <Eye size={11} style={{ display: "inline", marginRight: "3px", verticalAlign: "-1px" }} />Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel — Full view like MyAttendanceTab */}
      {detailUser && detailData && (() => {
        const att: any[] = detailData.attendance || [];
        const loginHist: any[] = detailData.loginHistory || [];

        // Compute stats
        const present = att.filter((a: any) => a.status === "PRESENT").length;
        const halfDay = att.filter((a: any) => a.status === "HALF_DAY").length;
        const absent = att.filter((a: any) => a.status === "ABSENT").length;
        const onLeave = att.filter((a: any) => a.status === "ON_LEAVE").length;
        const lateCount = att.filter((a: any) => a.isLate).length;
        const totalMinutes = att.reduce((s: number, a: any) => s + (a.totalMinutes || 0), 0);
        const equivalent = present + halfDay * 0.5;
        const workedDays = att.filter((a: any) => (a.totalMinutes || 0) > 0).length;
        const avgMinutes = workedDays > 0 ? Math.round(totalMinutes / workedDays) : 0;

        // Calendar
        const [cYear, cMon] = month.split("-").map(Number);
        const firstDow = new Date(cYear, cMon - 1, 1).getDay();
        const daysInMon = new Date(cYear, cMon, 0).getDate();
        const calDays: (number | null)[] = Array(firstDow === 0 ? 6 : firstDow - 1).fill(null);
        for (let i = 1; i <= daysInMon; i++) calDays.push(i);
        while (calDays.length % 7 !== 0) calDays.push(null);
        const getAtt = (day: number) => att.find((a: any) => new Date(a.date).getUTCDate() === day);

        const LOGOUT_REASONS: Record<string, string> = {
          manual: "Thủ công", auto_midnight: "Auto (0h)", idle_timeout: "Không hoạt động",
          session_expired: "Hết phiên", browser_closed: "Tắt trình duyệt",
        };

        return (
          <div style={{ ...cardStyle, borderColor: "#2563EB", borderWidth: "1.5px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
                📋 Chi tiết: {detailUser.name} — Tháng {month.split("-")[1]}/{month.split("-")[0]}
              </div>
              <button onClick={() => { setDetailUser(null); setDetailData(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={16} /></button>
            </div>

            {/* Stats cards + Calendar row */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
              {/* Calendar */}
              <div style={{ flex: "2 1 380px", background: "#f8fafc", borderRadius: "10px", padding: "14px", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", textAlign: "center" }}>
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(d => (
                    <div key={d} style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", padding: "4px" }}>{d}</div>
                  ))}
                  {calDays.map((day, i) => {
                    if (!day) return <div key={`e${i}`} />;
                    const a = getAtt(day);
                    const isToday = new Date().getDate() === day && new Date().getMonth() + 1 === cMon && new Date().getFullYear() === cYear;
                    const isFuture = new Date(cYear, cMon - 1, day) > new Date();
                    const cfg = a ? STATUS_CONFIG[a.status] : null;
                    return (
                      <div key={day} style={{
                        padding: "6px 2px", borderRadius: "8px", fontSize: "12px", position: "relative",
                        background: isToday ? "#eff6ff" : cfg ? cfg.bg + "60" : isFuture ? "#f9fafb" : "#fff",
                        border: isToday ? "1.5px solid #2563EB" : "1px solid #f1f5f9",
                      }}>
                        <div style={{ fontWeight: isToday ? 700 : 500, color: cfg ? cfg.color : "#9ca3af" }}>{day}</div>
                        {a && <div style={{ fontSize: "9px", color: cfg?.color, fontWeight: 500, marginTop: "1px" }}>{formatDuration(a.totalMinutes)}</div>}
                        {a?.isLate && <span style={{ position: "absolute", top: "1px", right: "3px", fontSize: "8px" }}>⚠</span>}
                        {a?.isManualEdit && <span style={{ position: "absolute", top: "1px", left: "3px", fontSize: "8px" }}>✏️</span>}
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: v.color }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: v.color }} />{v.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 180px" }}>
                {[
                  { label: "Tổng ngày công", value: `${equivalent}`, sub: `${present} + 0.5×${halfDay}`, color: "#16a34a", bg: "#f0fdf4" },
                  { label: "Tổng giờ online", value: formatDuration(totalMinutes), sub: `TB: ${formatDuration(avgMinutes)}/ngày`, color: "#2563EB", bg: "#eff6ff" },
                  { label: "Đi muộn", value: `${lateCount}`, sub: "", color: "#d97706", bg: "#fffbeb" },
                  { label: "Vắng / Nghỉ phép", value: `${absent} / ${onLeave}`, sub: "", color: "#dc2626", bg: "#fef2f2" },
                ].map((s, i) => (
                  <div key={i} style={{ background: s.bg, border: `1px solid ${s.color}20`, borderRadius: "10px", padding: "10px 14px" }}>
                    <div style={{ fontSize: "10px", color: "#6b7280", fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: "18px", fontWeight: 800, color: s.color, marginTop: "1px" }}>{s.value}</div>
                    {s.sub && <div style={{ fontSize: "10px", color: "#9ca3af" }}>{s.sub}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Daily attendance table */}
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>📅 Bảng chấm công chi tiết</div>
            <div style={{ overflowX: "auto", marginBottom: "16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                    {["Ngày", "Đăng Nhập", "Đăng Xuất", "Tổng Giờ", "Trạng Thái", "Ghi Chú", canEdit ? "Sửa" : ""].filter(Boolean).map(h => (
                      <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 600, color: "#475569" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {att.map((a: any) => {
                    const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.ABSENT;
                    return (
                      <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "7px 8px", fontWeight: 500 }}>{String(new Date(a.date).getUTCDate()).padStart(2, '0')}/{String(new Date(a.date).getUTCMonth() + 1).padStart(2, '0')}</td>
                        <td style={{ padding: "7px 8px" }}>{a.firstLogin ? format(new Date(a.firstLogin), "HH:mm") : "—"}{a.isLate && <span style={{ color: "#d97706", marginLeft: "3px" }}>⚠</span>}</td>
                        <td style={{ padding: "7px 8px" }}>{a.lastLogout ? format(new Date(a.lastLogout), "HH:mm") : "—"}</td>
                        <td style={{ padding: "7px 8px", fontWeight: 500 }}>{formatDuration(a.totalMinutes)}</td>
                        <td style={{ padding: "7px 8px" }}>
                          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 600, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                          {a.isManualEdit && <span style={{ marginLeft: "4px", fontSize: "10px" }}>✏️</span>}
                        </td>
                        <td style={{ padding: "7px 8px", color: "#6b7280", fontSize: "11px" }}>{a.editNote || ""}</td>
                        {canEdit && (
                          <td style={{ padding: "7px 8px" }}>
                            <button
                              onClick={() => setEditDialog({ id: a.id, date: a.date, currentStatus: a.status, newStatus: a.status, note: "" })}
                              style={{ fontSize: "11px", color: "#d97706", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "6px", padding: "2px 8px", cursor: "pointer" }}
                            >Sửa</button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Login History */}
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>🖥️ Lịch sử đăng nhập</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb" }}>
                    {["#", "Ngày", "Đăng Nhập", "Đăng Xuất", "Thời Gian", "Thiết Bị", "IP", "Lý Do Xuất"].map(h => (
                      <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 600, color: "#475569" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loginHist.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "20px", color: "#9ca3af" }}>Chưa có lịch sử</td></tr>
                  ) : loginHist.map((r: any, i: number) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      <td style={{ padding: "7px 8px", color: "#9ca3af" }}>{i + 1}</td>
                      <td style={{ padding: "7px 8px", fontWeight: 500 }}>{format(new Date(r.loginTime), "dd/MM/yyyy")}</td>
                      <td style={{ padding: "7px 8px" }}>{format(new Date(r.loginTime), "HH:mm")}</td>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Section D: Leave Management */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, color: "#1e293b", marginBottom: "14px" }}>
          <FileText size={16} color="#2563EB" /> Yêu cầu nghỉ phép
          {pendingCount > 0 && (
            <span style={{ fontSize: "11px", padding: "2px 10px", borderRadius: "10px", background: "#fef3c7", color: "#d97706", fontWeight: 600 }}>
              {pendingCount} chờ duyệt
            </span>
          )}
        </div>
        {leaveLoading ? <Loader2 className="animate-spin" size={18} /> : leaveRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#9ca3af", fontSize: "12px" }}>Không có yêu cầu</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb" }}>
                  {["#", "Nhân Viên", "Từ Ngày", "Đến Ngày", "Số Ngày", "Lý Do", "Trạng Thái", "Thao Tác"].map(h => (
                    <th key={h} style={{ padding: "8px 8px", textAlign: "left", fontWeight: 600, color: "#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((r: any, i: number) => {
                  const cfg = LEAVE_STATUS[r.leaveStatus] || LEAVE_STATUS.PENDING;
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                      <td style={{ padding: "7px 8px", color: "#9ca3af" }}>{i + 1}</td>
                      <td style={{ padding: "7px 8px", fontWeight: 600 }}>{r.user?.name || "—"}</td>
                      <td style={{ padding: "7px 8px" }}>{format(new Date(r.dateFrom), "dd/MM/yyyy")}</td>
                      <td style={{ padding: "7px 8px" }}>{format(new Date(r.dateTo), "dd/MM/yyyy")}</td>
                      <td style={{ padding: "7px 8px", fontWeight: 600 }}>{r.totalDays}</td>
                      <td style={{ padding: "7px 8px", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason}</td>
                      <td style={{ padding: "7px 8px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", fontWeight: 600, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </td>
                      <td style={{ padding: "7px 8px" }}>
                        {r.leaveStatus === "PENDING" && canEdit && (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button onClick={() => handleApprove(r.id)} style={{ fontSize: "11px", color: "#16a34a", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontWeight: 600 }}>
                              <Check size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Duyệt
                            </button>
                            <button onClick={() => setRejectDialog({ id: r.id, reason: "" })} style={{ fontSize: "11px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontWeight: 600 }}>
                              <X size={11} style={{ display: "inline", verticalAlign: "-1px" }} /> Từ chối
                            </button>
                          </div>
                        )}
                        {r.leaveStatus === "APPROVED" && <span style={{ fontSize: "11px", color: "#6b7280" }}>Duyệt: {r.approvedBy}</span>}
                        {r.leaveStatus === "REJECTED" && <span style={{ fontSize: "11px", color: "#6b7280" }}>Từ chối: {r.rejectedBy}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit attendance dialog */}
      {editDialog && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(0,0,0,0.4)" }} onClick={() => setEditDialog(null)} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 10051, background: "#fff", borderRadius: "14px", border: "1.5px solid #2563EB",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)", width: "400px", padding: "24px",
          }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", marginBottom: "16px" }}>
              Chỉnh sửa chấm công — {format(new Date(editDialog.date), "dd/MM/yyyy")}
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "4px" }}>Thay đổi thành</label>
              <select value={editDialog.newStatus} onChange={e => setEditDialog((d: any) => ({ ...d, newStatus: e.target.value }))} style={{ ...inputStyle, width: "100%" }}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "4px" }}>Ghi chú</label>
              <textarea value={editDialog.note} onChange={e => setEditDialog((d: any) => ({ ...d, note: e.target.value }))} rows={2} style={{ ...inputStyle, width: "100%", resize: "vertical" }} placeholder="Lý do chỉnh sửa..." />
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setEditDialog(null)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", fontSize: "13px", cursor: "pointer" }}>Hủy</button>
              <button onClick={handleEditSave} style={btnPrimary}><Save size={13} /> Lưu</button>
            </div>
          </div>
        </>
      )}

      {/* Reject dialog */}
      {rejectDialog && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 10050, background: "rgba(0,0,0,0.4)" }} onClick={() => setRejectDialog(null)} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 10051, background: "#fff", borderRadius: "14px", border: "1.5px solid #dc2626",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)", width: "400px", padding: "24px",
          }}>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "#dc2626", marginBottom: "16px" }}>Từ chối yêu cầu nghỉ phép</div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", display: "block", marginBottom: "4px" }}>Lý do từ chối</label>
              <textarea value={rejectDialog.reason} onChange={e => setRejectDialog((d: any) => ({ ...d, reason: e.target.value }))} rows={2} style={{ ...inputStyle, width: "100%", resize: "vertical" }} placeholder="Nhập lý do..." />
            </div>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setRejectDialog(null)} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #d1d5db", background: "#fff", fontSize: "13px", cursor: "pointer" }}>Hủy</button>
              <button onClick={handleReject} style={{ ...btnPrimary, background: "#dc2626" }}>Từ chối</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
