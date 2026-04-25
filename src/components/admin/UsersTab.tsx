"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Pencil, Key, Trash2, Loader2, X, Eye, EyeOff,
  LogOut, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  UserRow, PermGroupRow,
  overlayStyle, dialogBase, headerStyle, titleStyle, closeBtnBase,
  labelStyle, inputStyle, footerStyle, cancelBtnStyle, primaryBtnStyle,
  dangerBtnStyle, iFocus, iBlur, closeHoverIn, closeHoverOut,
} from "./admin-shared";

/* ------------------------------------------------------------------ */
/* Field helper                                                       */
/* ------------------------------------------------------------------ */
const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div>
    <label style={labelStyle}>{label} {required && <span style={{ color: "#ef4444" }}>*</span>}</label>
    {children}
  </div>
);

/* ================================================================== */
/* UsersTab                                                           */
/* ================================================================== */
export default function UsersTab() {
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
    } catch (err) { console.warn("[UsersTab] Failed to fetch users/groups:", err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-500">{users.length} nhân viên</p>
        <div className="flex gap-2 items-center">
          {/* Force Logout Dropdown */}
          <div className="relative">
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
                <div onClick={() => setShowLogoutMenu(false)} className="fixed inset-0 z-50" />
                <div className="absolute right-0 top-[calc(100%+4px)] z-[51] bg-white rounded-lg border border-gray-200 shadow-lg min-w-[200px] overflow-hidden">
                  <button
                    onClick={() => { setForceLogoutTarget({ mode: "all" }); setShowLogoutMenu(false); }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", color: "#dc2626", textAlign: "left", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <LogOut className="w-4 h-4" /> Tất cả người dùng
                  </button>
                  <div className="h-px bg-gray-100" />
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                    <div className="flex items-center gap-1">
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

/* ================================================================== */
/* UserFormDialog                                                      */
/* ================================================================== */
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
        <div style={headerStyle}>
          <span style={titleStyle}>{isEdit ? "Sửa thông tin nhân viên" : "Thêm nhân viên mới"}</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

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

/* ================================================================== */
/* PasswordDialog                                                      */
/* ================================================================== */
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

/* ================================================================== */
/* DeleteUserDialog                                                    */
/* ================================================================== */
function DeleteUserDialog({ user, onClose, onDeleted }: { user: UserRow; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      if (res.ok) { onDeleted(); onClose(); }
      else { toast.error("Lỗi khi khóa tài khoản"); }
    } catch { toast.error("Lỗi kết nối"); }
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

/* ================================================================== */
/* ForceLogoutDialog                                                   */
/* ================================================================== */
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
