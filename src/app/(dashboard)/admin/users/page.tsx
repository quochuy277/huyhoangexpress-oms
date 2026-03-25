"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Users, Shield, Plus, Pencil, Key, Trash2, Loader2, X, CheckSquare, Eye, EyeOff, LogOut, ChevronDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERMISSION_CATEGORIES, PERMISSION_KEYS } from "@/lib/permissions";

/* ============================================================
   Shared hardcoded styles — EXACT match with AddTodoDialog
   ============================================================ */
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
  maxWidth: "calc(100vw - 32px)",
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

const closeBtnBase: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px",
  borderRadius: "6px",
  color: "#666",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "color 0.2s, background 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#FFFFFF",
  border: "1.5px solid #d1d5db",
  borderRadius: "8px",
  padding: "10px 12px",
  fontSize: "14px",
  color: "#1a1a1a",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  marginTop: "24px",
  borderTop: "1px solid #e5e7eb",
  paddingTop: "16px",
};

const cancelBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #d1d5db",
  color: "#374151",
  padding: "8px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 0.2s",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "#2563EB",
  color: "#FFFFFF",
  border: "none",
  padding: "8px 20px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  transition: "background 0.2s",
};

const dangerBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  background: "#dc2626",
};

/* Focus / blur handlers */
const iFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "#2563EB";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
};
const iBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = "#d1d5db";
  e.currentTarget.style.boxShadow = "none";
};

/* Reusable close button hover */
const closeHoverIn = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.color = "#1a1a1a";
  e.currentTarget.style.background = "#f3f4f6";
};
const closeHoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.color = "#666";
  e.currentTarget.style.background = "none";
};

/* ============================================================ */

/* Reusable form field wrapper — defined outside components to avoid re-mount on re-render */
const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label style={labelStyle}>{label} {required && <span style={{ color: "#ef4444" }}>*</span>}</label>
    {children}
  </div>
);

interface UserRow {
  id: string;
  email: string;
  name: string;
  dateOfBirth: string | null;
  hometown: string | null;
  permanentAddress: string | null;
  currentAddress: string | null;
  citizenId: string | null;
  phone: string | null;
  socialLink: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  permissionGroup: { id: string; name: string } | null;
}

interface PermGroupRow {
  id: string;
  name: string;
  description: string | null;
  isSystemGroup: boolean;
  _count: { users: number };
  [key: string]: any;
}

import { AnnouncementSection } from "@/components/shared/AnnouncementSection";
import { Megaphone, FileText } from "lucide-react";

export default function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<"users" | "permissions" | "announcements" | "requests">("users");

  const TabBtn = ({ id, icon: Icon, label }: { id: typeof activeTab; icon: React.ElementType; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "8px",
        fontSize: "13px", fontWeight: 500, border: "none", cursor: "pointer", transition: "all 0.2s",
        background: activeTab === id ? "#FFFFFF" : "transparent",
        color: activeTab === id ? "#2563EB" : "#6b7280",
        boxShadow: activeTab === id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a" }}>Quản Lý Nhân Viên</h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "4px" }}>Quản lý nhân viên, phân quyền, thông báo và góp ý</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", background: "#f3f4f6", borderRadius: "8px", padding: "4px", width: "fit-content", flexWrap: "wrap" }}>
        <TabBtn id="users" icon={Users} label="Nhân viên" />
        <TabBtn id="permissions" icon={Shield} label="Nhóm quyền" />
        <TabBtn id="announcements" icon={Megaphone} label="Thông báo" />
        <TabBtn id="requests" icon={FileText} label="Yêu cầu & Góp ý" />
      </div>

      {activeTab === "users" && <UsersTab />}
      {activeTab === "permissions" && <PermissionsTab />}
      {activeTab === "announcements" && <AnnouncementSection />}
      {activeTab === "requests" && <RequestsFeedbackTab />}
    </div>
  );
}

// ===================================================================
// TAB 1: Users
// ===================================================================
function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [groups, setGroups] = useState<PermGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [forceLogoutTarget, setForceLogoutTarget] = useState<{ mode: "all" | "except_admin" | "user"; user?: UserRow } | null>(null);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, groupsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/permission-groups"),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (groupsRes.ok) setGroups(await groupsRes.json());
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>{users.length} nhân viên</p>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Force Logout Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowLogoutMenu(!showLogoutMenu)}
              style={{ ...dangerBtnStyle, padding: "8px 14px", fontSize: "13px" }}
              onMouseEnter={e => e.currentTarget.style.background = "#b91c1c"}
              onMouseLeave={e => e.currentTarget.style.background = "#dc2626"}
            >
              <LogOut className="w-4 h-4" /> Buộc đăng xuất <ChevronDown className="w-3 h-3" />
            </button>
            {showLogoutMenu && (
              <>
                <div onClick={() => setShowLogoutMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 51,
                  background: "#fff", borderRadius: "8px", border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: "200px", overflow: "hidden",
                }}>
                  <button
                    onClick={() => { setForceLogoutTarget({ mode: "all" }); setShowLogoutMenu(false); }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", color: "#dc2626", textAlign: "left", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <LogOut className="w-4 h-4" /> Tất cả người dùng
                  </button>
                  <div style={{ height: "1px", background: "#f3f4f6" }} />
                  <button
                    onClick={() => { setForceLogoutTarget({ mode: "except_admin" }); setShowLogoutMenu(false); }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", color: "#d97706", textAlign: "left", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fffbeb"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <LogOut className="w-4 h-4" /> Tất cả trừ Admin
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{ ...primaryBtnStyle, padding: "8px 18px" }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#1d4ed8"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#2563EB"}
          >
            <Plus className="w-4 h-4" /> Thêm nhân viên
          </button>
        </div>
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: "#f9fafb" }}>
              <TableHead className="w-[50px] text-center text-xs">STT</TableHead>
              <TableHead className="text-xs">Họ tên</TableHead>
              <TableHead className="text-xs">Ngày sinh</TableHead>
              <TableHead className="text-xs">SĐT</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Nhóm quyền</TableHead>
              <TableHead className="text-xs">Trạng thái</TableHead>
              <TableHead className="text-xs w-[120px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#9ca3af" }} /></TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center" style={{ color: "#9ca3af" }}>Chưa có nhân viên</TableCell></TableRow>
            ) : (
              users.map((u, i) => (
                <TableRow key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <TableCell className="text-center" style={{ fontSize: "12px", color: "#6b7280" }}>{i + 1}</TableCell>
                  <TableCell style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{u.name}</TableCell>
                  <TableCell style={{ fontSize: "12px", color: "#6b7280" }}>
                    {u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString("vi-VN") : "—"}
                  </TableCell>
                  <TableCell style={{ fontSize: "12px", color: "#6b7280" }}>{u.phone || "—"}</TableCell>
                  <TableCell style={{ fontSize: "12px", color: "#6b7280" }}>{u.email}</TableCell>
                  <TableCell>
                    <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 500, background: "#eff6ff", color: "#2563EB", border: "1px solid #bfdbfe" }}>
                      {u.permissionGroup?.name || u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 500, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>Đang hoạt động</span>
                    ) : (
                      <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 500, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>Đã khóa</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button onClick={() => setEditUser(u)} style={{ padding: "5px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#2563EB", transition: "background 0.2s" }} title="Sửa"
                        onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      ><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setPasswordUser(u)} style={{ padding: "5px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#d97706", transition: "background 0.2s" }} title="Đổi mật khẩu"
                        onMouseEnter={e => e.currentTarget.style.background = "#fffbeb"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      ><Key className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setForceLogoutTarget({ mode: "user", user: u })} style={{ padding: "5px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#7c3aed", transition: "background 0.2s" }} title="Buộc đăng xuất"
                        onMouseEnter={e => e.currentTarget.style.background = "#f5f3ff"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      ><LogOut className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteUser(u)} style={{ padding: "5px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#dc2626", transition: "background 0.2s" }} title="Khóa tài khoản"
                        onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(showAdd || editUser) && <UserFormDialog user={editUser} groups={groups} onClose={() => { setShowAdd(false); setEditUser(null); }} onSaved={fetchData} />}
      {passwordUser && <PasswordDialog user={passwordUser} onClose={() => setPasswordUser(null)} />}
      {deleteUser && <DeleteUserDialog user={deleteUser} onClose={() => setDeleteUser(null)} onDeleted={fetchData} />}
      {forceLogoutTarget && <ForceLogoutDialog target={forceLogoutTarget} onClose={() => setForceLogoutTarget(null)} />}
    </div>
  );
}

/* ============================================================
   User Add/Edit Dialog — 600px, createPortal
   ============================================================ */
function UserFormDialog({ user, groups, onClose, onSaved }: {
  user: UserRow | null;
  groups: PermGroupRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split("T")[0] : "",
    hometown: user?.hometown || "",
    permanentAddress: user?.permanentAddress || "",
    currentAddress: user?.currentAddress || "",
    citizenId: user?.citizenId || "",
    phone: user?.phone || "",
    socialLink: user?.socialLink || "",
    permissionGroupId: user?.permissionGroup?.id || (groups[0]?.id || ""),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.permissionGroupId) { setError("Vui lòng điền đầy đủ thông tin bắt buộc"); return; }
    if (!isEdit && (!form.password || form.password.length < 6)) { setError("Mật khẩu phải ít nhất 6 ký tự"); return; }
    setSaving(true); setError("");
    try {
      const url = isEdit ? `/api/admin/users/${user!.id}` : "/api/admin/users";
      const method = isEdit ? "PATCH" : "POST";
      const body: Record<string, any> = { ...form };
      if (isEdit) delete body.password;
      if (!body.dateOfBirth) body.dateOfBirth = null;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setError(d.error || "Có lỗi xảy ra"); }
    } catch { setError("Lỗi kết nối"); }
    finally { setSaving(false); }
  };



  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "600px", maxHeight: "85vh" }}>
        {/* Header */}
        <div style={headerStyle}>
          <span style={titleStyle}>{isEdit ? "Sửa thông tin nhân viên" : "Thêm nhân viên mới"}</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", flex: 1, maxHeight: "calc(85vh - 180px)", paddingRight: "4px" }}>
          <Field label="Họ tên" required>
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" required>
            <input type="email" style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </Field>
          {!isEdit && (
            <Field label="Mật khẩu" required>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} style={{ ...inputStyle, paddingRight: "40px" }} onFocus={iFocus} onBlur={iBlur} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Tối thiểu 6 ký tự" />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#6b7280", display: "flex", alignItems: "center" }} title={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Ngày sinh">
              <input type="date" style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
            </Field>
            <Field label="Số điện thoại">
              <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Quê quán">
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.hometown} onChange={e => setForm({ ...form, hometown: e.target.value })} />
          </Field>
          <Field label="Nơi đăng ký HKTT">
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.permanentAddress} onChange={e => setForm({ ...form, permanentAddress: e.target.value })} />
          </Field>
          <Field label="Nơi ở hiện nay">
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.currentAddress} onChange={e => setForm({ ...form, currentAddress: e.target.value })} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Số CCCD">
              <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.citizenId} onChange={e => setForm({ ...form, citizenId: e.target.value })} />
            </Field>
            <Field label="Link mạng xã hội">
              <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.socialLink} onChange={e => setForm({ ...form, socialLink: e.target.value })} />
            </Field>
          </div>
          <Field label="Nhóm quyền" required>
            <select style={{ ...inputStyle, cursor: "pointer", appearance: "auto" as any }} onFocus={iFocus} onBlur={iBlur} value={form.permissionGroupId} onChange={e => setForm({ ...form, permissionGroupId: e.target.value })}>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} {g.description ? `— ${g.description}` : ""}</option>)}
            </select>
          </Field>
          {error && <p style={{ fontSize: "13px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px" }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Hủy</button>
          <button onClick={handleSubmit} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#2563EB"}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ============================================================
   Password Dialog — 420px, createPortal
   ============================================================ */
function PasswordDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showPw, setShowPw] = useState(false);

  const handleSave = async () => {
    if (pw.length < 6) { setMsg({ type: "err", text: "Mật khẩu mới phải ít nhất 6 ký tự" }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/password`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: pw }) });
      if (res.ok) { setMsg({ type: "ok", text: "Đổi mật khẩu thành công!" }); setTimeout(onClose, 1200); }
      else { const d = await res.json().catch(() => ({})); setMsg({ type: "err", text: d.error || "Lỗi" }); }
    } catch { setMsg({ type: "err", text: "Lỗi kết nối" }); }
    finally { setSaving(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "420px" }}>
        <div style={headerStyle}>
          <span style={titleStyle}>Đổi mật khẩu — {user.name}</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>Mật khẩu mới <span style={{ color: "#ef4444" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} placeholder="Tối thiểu 6 ký tự" value={pw} onChange={e => setPw(e.target.value)} style={{ ...inputStyle, paddingRight: "40px" }} onFocus={iFocus} onBlur={iBlur} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#6b7280", display: "flex", alignItems: "center" }} title={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {msg && <p style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "8px", background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2", color: msg.type === "ok" ? "#16a34a" : "#dc2626", border: `1px solid ${msg.type === "ok" ? "#bbf7d0" : "#fecaca"}` }}>{msg.text}</p>}
        </div>
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Hủy</button>
          <button onClick={handleSave} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#2563EB"}
          >{saving ? "Đang lưu..." : "Đổi mật khẩu"}</button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ============================================================
   Delete User Dialog — 420px, createPortal
   ============================================================ */
function DeleteUserDialog({ user, onClose, onDeleted }: { user: UserRow; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (res.ok) { onDeleted(); onClose(); }
      else { alert("Lỗi khi khóa tài khoản"); }
    } catch { alert("Lỗi kết nối"); }
    finally { setDeleting(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "420px" }}>
        <div style={headerStyle}>
          <span style={{ ...titleStyle, color: "#dc2626" }}>Khóa tài khoản</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>
        <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
          Bạn có chắc muốn khóa tài khoản <b style={{ color: "#1a1a1a" }}>{user.name}</b>? Nhân viên sẽ không thể đăng nhập nhưng dữ liệu vẫn được giữ.
        </p>
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Hủy</button>
          <button onClick={handleDelete} disabled={deleting} style={{ ...dangerBtnStyle, opacity: deleting ? 0.6 : 1, cursor: deleting ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = "#b91c1c"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#dc2626"}
          >{deleting ? "Đang xử lý..." : "Khóa tài khoản"}</button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ============================================================
   Force Logout Dialog — 460px, createPortal
   ============================================================ */
function ForceLogoutDialog({ target, onClose }: {
  target: { mode: "all" | "except_admin" | "user"; user?: UserRow };
  onClose: () => void;
}) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const getTitle = () => {
    if (target.mode === "user") return `Buộc đăng xuất — ${target.user?.name}`;
    if (target.mode === "except_admin") return "Buộc đăng xuất (trừ Admin)";
    return "Buộc đăng xuất tất cả";
  };

  const getMessage = () => {
    if (target.mode === "user") return <>Bạn có chắc muốn buộc đăng xuất <b style={{ color: "#1a1a1a" }}>{target.user?.name}</b>? Phiên đăng nhập hiện tại của nhân viên này sẽ bị đóng.</>;
    if (target.mode === "except_admin") return <>Tất cả nhân viên (trừ tài khoản Admin hiện tại) sẽ bị đăng xuất. Mọi phiên đăng nhập đang hoạt động sẽ bị đóng.</>;
    return <><b style={{ color: "#dc2626" }}>Cảnh báo:</b> Tất cả mọi người (bao gồm cả bạn) sẽ bị đăng xuất. Bạn sẽ cần đăng nhập lại.</>;
  };

  const handleForceLogout = async () => {
    setProcessing(true);
    setResult(null);
    try {
      const body: any = {};
      if (target.mode === "user" && target.user) {
        body.userId = target.user.id;
      } else {
        body.mode = target.mode;
      }

      const res = await fetch("/api/admin/force-logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: data.message || `Đã đăng xuất ${data.count} phiên` });
        setTimeout(onClose, 2000);
      } else {
        setResult({ ok: false, message: data.error || "Có lỗi xảy ra" });
      }
    } catch {
      setResult({ ok: false, message: "Lỗi kết nối" });
    } finally {
      setProcessing(false);
    }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "460px" }}>
        <div style={headerStyle}>
          <span style={{ ...titleStyle, color: target.mode === "all" ? "#dc2626" : "#d97706" }}>{getTitle()}</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>{getMessage()}</p>

          {target.mode === "all" && (
            <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", fontSize: "12px", color: "#dc2626" }}>
              ⚠ Lưu ý: Bạn cũng sẽ bị đăng xuất và cần đăng nhập lại.
            </div>
          )}

          {result && (
            <p style={{
              fontSize: "13px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: result.ok ? "#f0fdf4" : "#fef2f2",
              color: result.ok ? "#16a34a" : "#dc2626",
              border: `1px solid ${result.ok ? "#bbf7d0" : "#fecaca"}`,
            }}>{result.message}</p>
          )}
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Hủy</button>
          <button
            onClick={handleForceLogout}
            disabled={processing || result?.ok === true}
            style={{
              ...dangerBtnStyle,
              opacity: processing || result?.ok === true ? 0.6 : 1,
              cursor: processing || result?.ok === true ? "not-allowed" : "pointer",
            }}
            onMouseEnter={e => { if (!processing) e.currentTarget.style.background = "#b91c1c"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#dc2626"}
          >
            {processing && <Loader2 className="w-4 h-4 animate-spin" />}
            {processing ? "Đang xử lý..." : "Xác nhận đăng xuất"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ===================================================================
// TAB 2: Permission Groups
// ===================================================================
function PermissionsTab() {
  const [groups, setGroups] = useState<PermGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editGroup, setEditGroup] = useState<PermGroupRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteGroup, setDeleteGroup] = useState<PermGroupRow | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/permission-groups");
      if (res.ok) setGroups(await res.json());
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  return (
    <div className="space-y-4">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>{groups.length} nhóm quyền</p>
        <button onClick={() => setShowAdd(true)} style={{ ...primaryBtnStyle, padding: "8px 18px" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#1d4ed8"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#2563EB"}
        >
          <Plus className="w-4 h-4" /> Thêm nhóm quyền
        </button>
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <Table>
          <TableHeader>
            <TableRow style={{ background: "#f9fafb" }}>
              <TableHead className="text-xs">Tên nhóm</TableHead>
              <TableHead className="text-xs">Mô tả</TableHead>
              <TableHead className="text-xs w-[100px] text-center">Số nhân viên</TableHead>
              <TableHead className="text-xs w-[100px]">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#9ca3af" }} /></TableCell></TableRow>
            ) : groups.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center" style={{ color: "#9ca3af" }}>Chưa có nhóm quyền</TableCell></TableRow>
            ) : (
              groups.map(g => (
                <TableRow key={g.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <TableCell style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>
                    {g.name}
                    {g.isSystemGroup && <span style={{ marginLeft: "8px", fontSize: "10px", padding: "2px 6px", background: "#f3f4f6", color: "#6b7280", borderRadius: "4px" }}>Hệ thống</span>}
                  </TableCell>
                  <TableCell style={{ fontSize: "12px", color: "#6b7280" }}>{g.description || "—"}</TableCell>
                  <TableCell className="text-center" style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{g._count.users}</TableCell>
                  <TableCell>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => setEditGroup(g)} style={{ padding: "5px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#2563EB", transition: "background 0.2s" }} title="Sửa"
                        onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      ><Pencil className="w-3.5 h-3.5" /></button>
                      <button
                        onClick={() => !g.isSystemGroup && g._count.users === 0 && setDeleteGroup(g)}
                        disabled={g.isSystemGroup || g._count.users > 0}
                        style={{
                          padding: "5px", borderRadius: "6px", border: "none", background: "transparent", transition: "background 0.2s",
                          cursor: g.isSystemGroup || g._count.users > 0 ? "not-allowed" : "pointer",
                          color: g.isSystemGroup || g._count.users > 0 ? "#d1d5db" : "#dc2626",
                          opacity: g.isSystemGroup || g._count.users > 0 ? 0.5 : 1,
                        }}
                        title={g.isSystemGroup ? "Không thể xóa nhóm hệ thống" : g._count.users > 0 ? `Đang có ${g._count.users} nhân viên` : "Xóa"}
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(showAdd || editGroup) && <PermGroupFormDialog group={editGroup} onClose={() => { setShowAdd(false); setEditGroup(null); }} onSaved={fetchGroups} />}
      {deleteGroup && <DeleteGroupDialog group={deleteGroup} onClose={() => setDeleteGroup(null)} onDeleted={fetchGroups} />}
    </div>
  );
}

/* ============================================================
   Permission Group Add/Edit Dialog — 640px, createPortal
   ============================================================ */
function PermGroupFormDialog({ group, onClose, onSaved }: {
  group: PermGroupRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!group;
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [perms, setPerms] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    for (const key of PERMISSION_KEYS) defaults[key] = group ? !!group[key] : false;
    return defaults;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const togglePerm = (key: string) => setPerms(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Tên nhóm quyền không được để trống"); return; }
    setSaving(true); setError("");
    try {
      const url = isEdit ? `/api/admin/permission-groups/${group!.id}` : "/api/admin/permission-groups";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), description: description.trim(), ...perms }) });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setError(d.error || "Có lỗi xảy ra"); }
    } catch { setError("Lỗi kết nối"); }
    finally { setSaving(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "640px", maxHeight: "85vh" }}>
        {/* Header */}
        <div style={headerStyle}>
          <span style={titleStyle}>{isEdit ? `Sửa nhóm quyền — ${group!.name}` : "Thêm nhóm quyền mới"}</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", flex: 1, maxHeight: "calc(85vh - 180px)", paddingRight: "4px" }}>
          <div>
            <label style={labelStyle}>Tên nhóm quyền <span style={{ color: "#ef4444" }}>*</span></label>
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Mô tả</label>
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Permission toggles by category */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {PERMISSION_CATEGORIES.map(cat => {
              const isFinance = !!cat.highlight;
              return (
                <div key={cat.title}>
                  {/* Category header */}
                  <div style={{
                    background: "#F3F4F6",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    marginBottom: "4px",
                  }}>
                    <span style={{
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      fontWeight: 600,
                      color: isFinance ? "#D97706" : "#2563EB",
                    }}>
                      {cat.title}
                    </span>
                  </div>
                  {/* Permission rows */}
                  {cat.keys.map(({ key, label }, idx) => (
                    <div
                      key={key}
                      onClick={() => togglePerm(key)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        background: idx % 2 === 1 ? "#F9FAFB" : "transparent",
                        cursor: "pointer",
                        borderRadius: "4px",
                        transition: "background 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "#1a1a1a" }}>{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={perms[key]}
                        onClick={(e) => { e.stopPropagation(); togglePerm(key); }}
                        style={{
                          position: "relative",
                          display: "inline-flex",
                          height: "22px",
                          width: "40px",
                          alignItems: "center",
                          borderRadius: "11px",
                          border: "none",
                          cursor: "pointer",
                          transition: "background 0.2s",
                          background: perms[key] ? "#2563EB" : "#d1d5db",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{
                          display: "inline-block",
                          height: "16px",
                          width: "16px",
                          borderRadius: "50%",
                          background: "#FFFFFF",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                          transition: "transform 0.2s",
                          transform: perms[key] ? "translateX(18px)" : "translateX(3px)",
                        }} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {error && <p style={{ fontSize: "13px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px" }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Hủy</button>
          <button onClick={handleSubmit} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#2563EB"}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ============================================================
   Delete Group Dialog — 420px, createPortal
   ============================================================ */
function DeleteGroupDialog({ group, onClose, onDeleted }: { group: PermGroupRow; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/permission-groups/${group.id}`, { method: "DELETE" });
      if (res.ok) { onDeleted(); onClose(); }
      else { const d = await res.json().catch(() => ({})); alert(d.error || "Lỗi"); }
    } catch { alert("Lỗi kết nối"); }
    finally { setDeleting(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "420px" }}>
        <div style={headerStyle}>
          <span style={{ ...titleStyle, color: "#dc2626" }}>Xóa nhóm quyền</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>
        <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
          Bạn có chắc muốn xóa nhóm quyền <b style={{ color: "#1a1a1a" }}>{group.name}</b>?
        </p>
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Hủy</button>
          <button onClick={handleDelete} disabled={deleting} style={{ ...dangerBtnStyle, opacity: deleting ? 0.6 : 1, cursor: deleting ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = "#b91c1c"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#dc2626"}
          >{deleting ? "Đang xóa..." : "Xóa"}</button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ===================================================================
// TAB 4: Requests & Feedback (Admin reviews)
// ===================================================================
interface ChangeReq {
  id: string;
  userId: string;
  fieldName: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

function RequestsFeedbackTab() {
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
    } catch { } finally { setLoading(false); }
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
    } catch { }
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

