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

      {/* Detail Panel */}
      {detailUser && detailData && (
        <div style={{ ...cardStyle, borderColor: "#2563EB", borderWidth: "1.5px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b" }}>
              Chi tiết: {detailUser.name} — Tháng {month.split("-")[1]}/{month.split("-")[0]}
            </div>
            <button onClick={() => { setDetailUser(null); setDetailData(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={16} /></button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                  {["Ngày", "Đăng Nhập", "Đăng Xuất", "Tổng Giờ", "Trạng Thái", "Ghi Chú", canEdit ? "Sửa" : ""].filter(Boolean).map(h => (
                    <th key={h} style={{ padding: "7px 8px", textAlign: "left", fontWeight: 600, color: "#475569" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(detailData.attendance || []).map((a: any) => {
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
        </div>
      )}

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
