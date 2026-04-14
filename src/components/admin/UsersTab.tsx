"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Pencil, Key, Trash2, Loader2, X, Eye, EyeOff,
  LogOut, ChevronDown,
} from "lucide-react";
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
        <p className="text-[13px] text-gray-500">{users.length} nh\u00e2n vi\u00ean</p>
        <div className="flex gap-2 items-center">
          {/* Force Logout Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLogoutMenu(!showLogoutMenu)}
              style={{ ...dangerBtnStyle, padding: "8px 14px", fontSize: "13px" }}
              onMouseEnter={e => e.currentTarget.style.background = "#b91c1c"}
              onMouseLeave={e => e.currentTarget.style.background = "#dc2626"}
            >
              <LogOut className="w-4 h-4" /> Bu\u1ed9c \u0111\u0103ng xu\u1ea5t <ChevronDown className="w-3 h-3" />
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
                    <LogOut className="w-4 h-4" /> T\u1ea5t c\u1ea3 ng\u01b0\u1eddi d\u00f9ng
                  </button>
                  <div className="h-px bg-gray-100" />
                  <button
                    onClick={() => { setForceLogoutTarget({ mode: "except_admin" }); setShowLogoutMenu(false); }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "10px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: "13px", color: "#d97706", textAlign: "left", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fffbeb"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <LogOut className="w-4 h-4" /> T\u1ea5t c\u1ea3 tr\u1eeb Admin
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
            <Plus className="w-4 h-4" /> Th\u00eam nh\u00e2n vi\u00ean
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow style={{ background: "#f9fafb" }}>
              <TableHead className="w-[50px] text-center text-xs">STT</TableHead>
              <TableHead className="text-xs">H\u1ecd t\u00ean</TableHead>
              <TableHead className="text-xs">Ng\u00e0y sinh</TableHead>
              <TableHead className="text-xs">S\u0110T</TableHead>
              <TableHead className="text-xs">Email</TableHead>
              <TableHead className="text-xs">Nh\u00f3m quy\u1ec1n</TableHead>
              <TableHead className="text-xs">Tr\u1ea1ng th\u00e1i</TableHead>
              <TableHead className="text-xs w-[120px]">Thao t\u00e1c</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#9ca3af" }} /></TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="h-32 text-center" style={{ color: "#9ca3af" }}>Ch\u01b0a c\u00f3 nh\u00e2n vi\u00ean</TableCell></TableRow>
            ) : (
              users.map((u, i) => (
                <TableRow key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <TableCell className="text-center" style={{ fontSize: "12px", color: "#6b7280" }}>{i + 1}</TableCell>
                  <TableCell style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{u.name}</TableCell>
                  <TableCell style={{ fontSize: "12px", color: "#6b7280" }}>
                    {u.dateOfBirth ? new Date(u.dateOfBirth).toLocaleDateString("vi-VN") : "\u2014"}
                  </TableCell>
                  <TableCell style={{ fontSize: "12px", color: "#6b7280" }}>{u.phone || "\u2014"}</TableCell>
                  <TableCell style={{ fontSize: "12px", color: "#6b7280" }}>{u.email}</TableCell>
                  <TableCell>
                    <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 500, background: "#eff6ff", color: "#2563EB", border: "1px solid #bfdbfe" }}>
                      {u.permissionGroup?.name || u.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 500, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>\u0110ang ho\u1ea1t \u0111\u1ed9ng</span>
                    ) : (
                      <span style={{ padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 500, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>\u0110\u00e3 kh\u00f3a</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditUser(u)} style={{ padding: "5px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#2563EB", transition: "background 0.2s" }} title="S\u1eeda"
                        onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      ><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setPasswordUser(u)} style={{ padding: "5px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#d97706", transition: "background 0.2s" }} title="\u0110\u1ed5i m\u1eadt kh\u1ea9u"
                        onMouseEnter={e => e.currentTarget.style.background = "#fffbeb"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      ><Key className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setForceLogoutTarget({ mode: "user", user: u })} style={{ padding: "5px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#7c3aed", transition: "background 0.2s" }} title="Bu\u1ed9c \u0111\u0103ng xu\u1ea5t"
                        onMouseEnter={e => e.currentTarget.style.background = "#f5f3ff"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      ><LogOut className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteUser(u)} style={{ padding: "5px", borderRadius: "6px", border: "none", background: "transparent", cursor: "pointer", color: "#dc2626", transition: "background 0.2s" }} title="Kh\u00f3a t\u00e0i kho\u1ea3n"
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
    if (!form.name.trim() || !form.email.trim() || !form.permissionGroupId) { setError("Vui l\u00f2ng \u0111i\u1ec1n \u0111\u1ea7y \u0111\u1ee7 th\u00f4ng tin b\u1eaft bu\u1ed9c"); return; }
    if (!isEdit && (!form.password || form.password.length < 6)) { setError("M\u1eadt kh\u1ea9u ph\u1ea3i \u00edt nh\u1ea5t 6 k\u00fd t\u1ef1"); return; }
    setSaving(true); setError("");
    try {
      const url = isEdit ? `/api/admin/users/${user!.id}` : "/api/admin/users";
      const method = isEdit ? "PATCH" : "POST";
      const body: Record<string, any> = { ...form };
      if (isEdit) delete body.password;
      if (!body.dateOfBirth) body.dateOfBirth = null;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { onSaved(); onClose(); }
      else { const d = await res.json().catch(() => ({})); setError(d.error || "C\u00f3 l\u1ed7i x\u1ea3y ra"); }
    } catch { setError("L\u1ed7i k\u1ebft n\u1ed1i"); }
    finally { setSaving(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "600px", maxHeight: "85vh" }}>
        <div style={headerStyle}>
          <span style={titleStyle}>{isEdit ? "S\u1eeda th\u00f4ng tin nh\u00e2n vi\u00ean" : "Th\u00eam nh\u00e2n vi\u00ean m\u1edbi"}</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", flex: 1, maxHeight: "calc(85vh - 180px)", paddingRight: "4px" }}>
          <Field label="H\u1ecd t\u00ean" required>
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email" required>
            <input type="email" style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </Field>
          {!isEdit && (
            <Field label="M\u1eadt kh\u1ea9u" required>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} style={{ ...inputStyle, paddingRight: "40px" }} onFocus={iFocus} onBlur={iBlur} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="T\u1ed1i thi\u1ec3u 6 k\u00fd t\u1ef1" />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#6b7280", display: "flex", alignItems: "center" }} title={showPw ? "\u1ea8n m\u1eadt kh\u1ea9u" : "Hi\u1ec7n m\u1eadt kh\u1ea9u"}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Ng\u00e0y sinh">
              <input type="date" style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} />
            </Field>
            <Field label="S\u1ed1 \u0111i\u1ec7n tho\u1ea1i">
              <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </Field>
          </div>
          <Field label="Qu\u00ea qu\u00e1n">
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.hometown} onChange={e => setForm({ ...form, hometown: e.target.value })} />
          </Field>
          <Field label="N\u01a1i \u0111\u0103ng k\u00fd HKTT">
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.permanentAddress} onChange={e => setForm({ ...form, permanentAddress: e.target.value })} />
          </Field>
          <Field label="N\u01a1i \u1edf hi\u1ec7n nay">
            <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.currentAddress} onChange={e => setForm({ ...form, currentAddress: e.target.value })} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="S\u1ed1 CCCD">
              <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.citizenId} onChange={e => setForm({ ...form, citizenId: e.target.value })} />
            </Field>
            <Field label="Link m\u1ea1ng x\u00e3 h\u1ed9i">
              <input style={inputStyle} onFocus={iFocus} onBlur={iBlur} value={form.socialLink} onChange={e => setForm({ ...form, socialLink: e.target.value })} />
            </Field>
          </div>
          <Field label="Nh\u00f3m quy\u1ec1n" required>
            <select style={{ ...inputStyle, cursor: "pointer", appearance: "auto" as any }} onFocus={iFocus} onBlur={iBlur} value={form.permissionGroupId} onChange={e => setForm({ ...form, permissionGroupId: e.target.value })}>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} {g.description ? `\u2014 ${g.description}` : ""}</option>)}
            </select>
          </Field>
          {error && <p style={{ fontSize: "13px", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px" }}>{error}</p>}
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>H\u1ee7y</button>
          <button onClick={handleSubmit} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#2563EB"}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {saving ? "\u0110ang l\u01b0u..." : "L\u01b0u"}
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
    if (pw.length < 6) { setMsg({ type: "err", text: "M\u1eadt kh\u1ea9u m\u1edbi ph\u1ea3i \u00edt nh\u1ea5t 6 k\u00fd t\u1ef1" }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/password`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: pw }) });
      if (res.ok) { setMsg({ type: "ok", text: "\u0110\u1ed5i m\u1eadt kh\u1ea9u th\u00e0nh c\u00f4ng!" }); setTimeout(onClose, 1200); }
      else { const d = await res.json().catch(() => ({})); setMsg({ type: "err", text: d.error || "L\u1ed7i" }); }
    } catch { setMsg({ type: "err", text: "L\u1ed7i k\u1ebft n\u1ed1i" }); }
    finally { setSaving(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "420px" }}>
        <div style={headerStyle}>
          <span style={titleStyle}>\u0110\u1ed5i m\u1eadt kh\u1ea9u \u2014 {user.name}</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={labelStyle}>M\u1eadt kh\u1ea9u m\u1edbi <span style={{ color: "#ef4444" }}>*</span></label>
            <div style={{ position: "relative" }}>
              <input type={showPw ? "text" : "password"} placeholder="T\u1ed1i thi\u1ec3u 6 k\u00fd t\u1ef1" value={pw} onChange={e => setPw(e.target.value)} style={{ ...inputStyle, paddingRight: "40px" }} onFocus={iFocus} onBlur={iBlur} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#6b7280", display: "flex", alignItems: "center" }} title={showPw ? "\u1ea8n m\u1eadt kh\u1ea9u" : "Hi\u1ec7n m\u1eadt kh\u1ea9u"}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {msg && <p style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "8px", background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2", color: msg.type === "ok" ? "#16a34a" : "#dc2626", border: `1px solid ${msg.type === "ok" ? "#bbf7d0" : "#fecaca"}` }}>{msg.text}</p>}
        </div>
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>H\u1ee7y</button>
          <button onClick={handleSave} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1, cursor: saving ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#1d4ed8"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#2563EB"}
          >{saving ? "\u0110ang l\u01b0u..." : "\u0110\u1ed5i m\u1eadt kh\u1ea9u"}</button>
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
      else { alert("L\u1ed7i khi kh\u00f3a t\u00e0i kho\u1ea3n"); }
    } catch { alert("L\u1ed7i k\u1ebft n\u1ed1i"); }
    finally { setDeleting(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "420px" }}>
        <div style={headerStyle}>
          <span style={{ ...titleStyle, color: "#dc2626" }}>Kh\u00f3a t\u00e0i kho\u1ea3n</span>
          <button onClick={onClose} style={closeBtnBase} onMouseEnter={closeHoverIn} onMouseLeave={closeHoverOut}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>
        <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>
          B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n kh\u00f3a t\u00e0i kho\u1ea3n <b style={{ color: "#1a1a1a" }}>{user.name}</b>? Nh\u00e2n vi\u00ean s\u1ebd kh\u00f4ng th\u1ec3 \u0111\u0103ng nh\u1eadp nh\u01b0ng d\u1eef li\u1ec7u v\u1eabn \u0111\u01b0\u1ee3c gi\u1eef.
        </p>
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>H\u1ee7y</button>
          <button onClick={handleDelete} disabled={deleting} style={{ ...dangerBtnStyle, opacity: deleting ? 0.6 : 1, cursor: deleting ? "not-allowed" : "pointer" }}
            onMouseEnter={e => { if (!deleting) e.currentTarget.style.background = "#b91c1c"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#dc2626"}
          >{deleting ? "\u0110ang x\u1eed l\u00fd..." : "Kh\u00f3a t\u00e0i kho\u1ea3n"}</button>
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
    if (target.mode === "user") return `Bu\u1ed9c \u0111\u0103ng xu\u1ea5t \u2014 ${target.user?.name}`;
    if (target.mode === "except_admin") return "Bu\u1ed9c \u0111\u0103ng xu\u1ea5t (tr\u1eeb Admin)";
    return "Bu\u1ed9c \u0111\u0103ng xu\u1ea5t t\u1ea5t c\u1ea3";
  };

  const getMessage = () => {
    if (target.mode === "user") return <>B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n bu\u1ed9c \u0111\u0103ng xu\u1ea5t <b style={{ color: "#1a1a1a" }}>{target.user?.name}</b>? Phi\u00ean \u0111\u0103ng nh\u1eadp hi\u1ec7n t\u1ea1i c\u1ee7a nh\u00e2n vi\u00ean n\u00e0y s\u1ebd b\u1ecb \u0111\u00f3ng.</>;
    if (target.mode === "except_admin") return <>T\u1ea5t c\u1ea3 nh\u00e2n vi\u00ean (tr\u1eeb t\u00e0i kho\u1ea3n Admin hi\u1ec7n t\u1ea1i) s\u1ebd b\u1ecb \u0111\u0103ng xu\u1ea5t. M\u1ecdi phi\u00ean \u0111\u0103ng nh\u1eadp \u0111ang ho\u1ea1t \u0111\u1ed9ng s\u1ebd b\u1ecb \u0111\u00f3ng.</>;
    return <><b style={{ color: "#dc2626" }}>C\u1ea3nh b\u00e1o:</b> T\u1ea5t c\u1ea3 m\u1ecdi ng\u01b0\u1eddi (bao g\u1ed3m c\u1ea3 b\u1ea1n) s\u1ebd b\u1ecb \u0111\u0103ng xu\u1ea5t. B\u1ea1n s\u1ebd c\u1ea7n \u0111\u0103ng nh\u1eadp l\u1ea1i.</>;
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
        setResult({ ok: true, message: data.message || `\u0110\u00e3 \u0111\u0103ng xu\u1ea5t ${data.count} phi\u00ean` });
        setTimeout(onClose, 2000);
      } else {
        setResult({ ok: false, message: data.error || "C\u00f3 l\u1ed7i x\u1ea3y ra" });
      }
    } catch {
      setResult({ ok: false, message: "L\u1ed7i k\u1ebft n\u1ed1i" });
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
              \u26a0 L\u01b0u \u00fd: B\u1ea1n c\u0169ng s\u1ebd b\u1ecb \u0111\u0103ng xu\u1ea5t v\u00e0 c\u1ea7n \u0111\u0103ng nh\u1eadp l\u1ea1i.
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
          <button onClick={onClose} style={cancelBtnStyle} onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>H\u1ee7y</button>
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
            {processing ? "\u0110ang x\u1eed l\u00fd..." : "X\u00e1c nh\u1eadn \u0111\u0103ng xu\u1ea5t"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
