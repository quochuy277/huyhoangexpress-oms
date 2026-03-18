"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Lock, FileEdit, MessageSquare, User, Calendar, Phone, MapPin, CreditCard, Link2, Mail, Shield } from "lucide-react";

/* ============================================================
   Shared styles
   ============================================================ */
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9998, backgroundColor: "rgba(0,0,0,0.5)",
};
const dialogBase: React.CSSProperties = {
  position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 9999,
  maxWidth: "calc(100vw - 32px)", background: "#FFFFFF", border: "1.5px solid #2563EB",
  borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: "24px",
  display: "flex", flexDirection: "column",
};
const headerStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  borderBottom: "1px solid #e5e7eb", paddingBottom: "16px", marginBottom: "20px",
};
const titleStyle: React.CSSProperties = { fontSize: "18px", fontWeight: 600, color: "#1a1a1a" };
const closeBtnBase: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px",
  color: "#666", display: "flex", alignItems: "center", justifyContent: "center",
};
const inputStyle: React.CSSProperties = {
  width: "100%", background: "#FFFFFF", border: "1.5px solid #d1d5db", borderRadius: "8px",
  padding: "10px 12px", fontSize: "14px", color: "#1a1a1a", outline: "none", boxSizing: "border-box",
};
const footerStyle: React.CSSProperties = {
  display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px",
  borderTop: "1px solid #e5e7eb", paddingTop: "16px",
};
const cancelBtnStyle: React.CSSProperties = {
  background: "transparent", border: "1px solid #d1d5db", color: "#374151",
  padding: "8px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer",
};
const primaryBtnStyle: React.CSSProperties = {
  background: "#2563EB", color: "#FFFFFF", border: "none", padding: "8px 20px",
  borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer",
  display: "flex", alignItems: "center", gap: "6px",
};

const PROFILE_FIELDS = [
  { key: "name", label: "Họ tên", icon: User },
  { key: "email", label: "Email", icon: Mail },
  { key: "phone", label: "Số điện thoại", icon: Phone },
  { key: "dateOfBirth", label: "Ngày sinh", icon: Calendar, format: "date" },
  { key: "citizenId", label: "Số CCCD", icon: CreditCard },
  { key: "hometown", label: "Quê quán", icon: MapPin },
  { key: "permanentAddress", label: "Nơi đăng ký HKTT", icon: MapPin },
  { key: "currentAddress", label: "Nơi ở hiện nay", icon: MapPin },
  { key: "socialLink", label: "Link mạng xã hội", icon: Link2 },
] as const;

const EDITABLE_FIELDS = PROFILE_FIELDS.filter(f => !["name", "email"].includes(f.key));

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  citizenId: string | null;
  hometown: string | null;
  permanentAddress: string | null;
  currentAddress: string | null;
  socialLink: string | null;
  role: string;
  department: string | null;
  position: string | null;
  createdAt: string;
  permissionGroup: { name: string } | null;
  [key: string]: unknown;
}

interface Props {
  onClose: () => void;
}

export function UserProfileDialog({ onClose }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subDialog, setSubDialog] = useState<"password" | "change" | "feedback" | null>(null);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const formatValue = (key: string, val: unknown): string => {
    if (!val) return "—";
    if (key === "dateOfBirth") return new Date(val as string).toLocaleDateString("vi-VN");
    return String(val);
  };

  return createPortal(
    <>
      <div onClick={onClose} style={overlayStyle} />
      <div style={{ ...dialogBase, width: "560px", maxHeight: "85vh" }}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, #3b82f6, #6366f1)", color: "#fff", fontSize: "16px", fontWeight: 700,
            }}>
              {profile?.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div>
              <span style={titleStyle}>Thông tin cá nhân</span>
              {profile && (
                <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                  <span style={{ fontSize: "11px", padding: "1px 8px", borderRadius: "10px", background: "#eff6ff", color: "#2563EB", border: "1px solid #bfdbfe" }}>
                    {profile.permissionGroup?.name || profile.role}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} style={closeBtnBase}
            onMouseEnter={e => { e.currentTarget.style.color = "#1a1a1a"; e.currentTarget.style.background = "#f3f4f6"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#666"; e.currentTarget.style.background = "none"; }}>
            <X style={{ width: "18px", height: "18px" }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, maxHeight: "calc(85vh - 250px)" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#9ca3af" }} />
            </div>
          ) : profile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {PROFILE_FIELDS.map(({ key, label, icon: Icon }) => (
                <div key={key} style={{
                  display: "flex", alignItems: "center", padding: "12px 8px",
                  borderBottom: "1px solid #f3f4f6", gap: "12px",
                }}>
                  <Icon style={{ width: "16px", height: "16px", color: "#9ca3af", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: "#6b7280", width: "140px", flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a", flex: 1 }}>
                    {formatValue(key, profile[key])}
                  </span>
                </div>
              ))}
              {/* Extra info */}
              <div style={{ display: "flex", alignItems: "center", padding: "12px 8px", borderBottom: "1px solid #f3f4f6", gap: "12px" }}>
                <Shield style={{ width: "16px", height: "16px", color: "#9ca3af", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: "#6b7280", width: "140px", flexShrink: 0 }}>Nhóm quyền</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{profile.permissionGroup?.name || profile.role}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", padding: "12px 8px", gap: "12px" }}>
                <Calendar style={{ width: "16px", height: "16px", color: "#9ca3af", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", color: "#6b7280", width: "140px", flexShrink: 0 }}>Ngày tạo TK</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a" }}>{new Date(profile.createdAt).toLocaleDateString("vi-VN")}</span>
              </div>
            </div>
          ) : (
            <p style={{ textAlign: "center", color: "#dc2626" }}>Không thể tải thông tin</p>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "8px", marginTop: "20px", borderTop: "1px solid #e5e7eb", paddingTop: "16px", flexWrap: "wrap" }}>
          <button onClick={() => setSubDialog("password")} style={{
            ...cancelBtnStyle, display: "flex", alignItems: "center", gap: "6px",
            border: "1px solid #d97706", color: "#d97706",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#fffbeb"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <Lock style={{ width: "14px", height: "14px" }} /> Đổi mật khẩu
          </button>
          <button onClick={() => setSubDialog("change")} style={{
            ...cancelBtnStyle, display: "flex", alignItems: "center", gap: "6px",
            border: "1px solid #2563EB", color: "#2563EB",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <FileEdit style={{ width: "14px", height: "14px" }} /> Đề nghị thay đổi
          </button>
          <button onClick={() => setSubDialog("feedback")} style={{
            ...cancelBtnStyle, display: "flex", alignItems: "center", gap: "6px",
            border: "1px solid #16a34a", color: "#16a34a",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "#f0fdf4"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <MessageSquare style={{ width: "14px", height: "14px" }} /> Góp ý
          </button>
        </div>
      </div>

      {/* Sub Dialogs */}
      {subDialog === "password" && <PasswordSubDialog onClose={() => setSubDialog(null)} />}
      {subDialog === "change" && profile && <ChangeRequestSubDialog profile={profile} onClose={() => setSubDialog(null)} />}
      {subDialog === "feedback" && <FeedbackSubDialog onClose={() => setSubDialog(null)} />}
    </>,
    document.body
  );
}

/* ============================================================
   Password Sub-Dialog
   ============================================================ */
function PasswordSubDialog({ onClose }: { onClose: () => void }) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSave = async () => {
    if (!oldPw) { setMsg({ type: "err", text: "Vui lòng nhập mật khẩu cũ" }); return; }
    if (newPw.length < 6) { setMsg({ type: "err", text: "Mật khẩu mới phải ít nhất 6 ký tự" }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      });
      if (res.ok) { setMsg({ type: "ok", text: "Đổi mật khẩu thành công!" }); setTimeout(onClose, 1200); }
      else { const d = await res.json().catch(() => ({})); setMsg({ type: "err", text: d.error || "Lỗi" }); }
    } catch { setMsg({ type: "err", text: "Lỗi kết nối" }); }
    finally { setSaving(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={{ ...overlayStyle, zIndex: 10098 }} />
      <div style={{ ...dialogBase, width: "420px", zIndex: 10099 }}>
        <div style={headerStyle}>
          <span style={titleStyle}>Đổi mật khẩu</span>
          <button onClick={onClose} style={closeBtnBase}><X style={{ width: "18px", height: "18px" }} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Mật khẩu cũ <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="password" style={inputStyle} value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="Nhập mật khẩu hiện tại" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Mật khẩu mới <span style={{ color: "#ef4444" }}>*</span></label>
            <input type="password" style={inputStyle} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Tối thiểu 6 ký tự" />
          </div>
          {msg && <p style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "8px", background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2", color: msg.type === "ok" ? "#16a34a" : "#dc2626", border: `1px solid ${msg.type === "ok" ? "#bbf7d0" : "#fecaca"}` }}>{msg.text}</p>}
        </div>
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle}>Hủy</button>
          <button onClick={handleSave} disabled={saving} style={{ ...primaryBtnStyle, background: "#d97706", opacity: saving ? 0.6 : 1 }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#b45309"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#d97706"}>
            {saving ? "Đang lưu..." : "Đổi mật khẩu"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ============================================================
   Change Request Sub-Dialog
   ============================================================ */
function ChangeRequestSubDialog({ profile, onClose }: { profile: ProfileData; onClose: () => void }) {
  const [selectedField, setSelectedField] = useState<string>(EDITABLE_FIELDS[0].key);
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const field = EDITABLE_FIELDS.find(f => f.key === selectedField)!;
  const oldValue = profile[selectedField] ? String(profile[selectedField]) : "";

  const handleSubmit = async () => {
    if (!newValue.trim()) { setMsg({ type: "err", text: "Vui lòng nhập giá trị mới" }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/profile/change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldName: selectedField, fieldLabel: field.label, oldValue, newValue: newValue.trim() }),
      });
      if (res.ok) { setMsg({ type: "ok", text: "Đã gửi yêu cầu thành công! Admin sẽ xem xét." }); setTimeout(onClose, 1500); }
      else { const d = await res.json().catch(() => ({})); setMsg({ type: "err", text: d.error || "Lỗi" }); }
    } catch { setMsg({ type: "err", text: "Lỗi kết nối" }); }
    finally { setSaving(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={{ ...overlayStyle, zIndex: 10098 }} />
      <div style={{ ...dialogBase, width: "480px", zIndex: 10099 }}>
        <div style={headerStyle}>
          <span style={titleStyle}>Đề nghị thay đổi thông tin</span>
          <button onClick={onClose} style={closeBtnBase}><X style={{ width: "18px", height: "18px" }} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Thông tin muốn thay đổi</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={selectedField} onChange={e => { setSelectedField(e.target.value); setNewValue(""); }}>
              {EDITABLE_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "10px 14px" }}>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>Giá trị hiện tại:</span>
            <p style={{ fontSize: "13px", fontWeight: 500, color: "#1a1a1a", marginTop: "2px" }}>{oldValue || "— (chưa có)"}</p>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>Giá trị mới <span style={{ color: "#ef4444" }}>*</span></label>
            <input style={inputStyle} value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Nhập giá trị mới..." />
          </div>
          {msg && <p style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "8px", background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2", color: msg.type === "ok" ? "#16a34a" : "#dc2626", border: `1px solid ${msg.type === "ok" ? "#bbf7d0" : "#fecaca"}` }}>{msg.text}</p>}
        </div>
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle}>Hủy</button>
          <button onClick={handleSubmit} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Đang gửi..." : "Gửi đề nghị"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ============================================================
   Feedback Sub-Dialog
   ============================================================ */
function FeedbackSubDialog({ onClose }: { onClose: () => void }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) { setMsg({ type: "err", text: "Vui lòng nhập nội dung" }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch("/api/profile/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) { setMsg({ type: "ok", text: "Đã gửi góp ý thành công! Cảm ơn bạn." }); setTimeout(onClose, 1500); }
      else { const d = await res.json().catch(() => ({})); setMsg({ type: "err", text: d.error || "Lỗi" }); }
    } catch { setMsg({ type: "err", text: "Lỗi kết nối" }); }
    finally { setSaving(false); }
  };

  return createPortal(
    <>
      <div onClick={onClose} style={{ ...overlayStyle, zIndex: 10098 }} />
      <div style={{ ...dialogBase, width: "480px", zIndex: 10099 }}>
        <div style={headerStyle}>
          <span style={titleStyle}>Góp ý</span>
          <button onClick={onClose} style={closeBtnBase}><X style={{ width: "18px", height: "18px" }} /></button>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
            Nội dung góp ý <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Nhập nội dung góp ý, đề xuất, hoặc phản ánh..."
          />
          {msg && <p style={{ fontSize: "13px", padding: "10px 14px", borderRadius: "8px", marginTop: "12px", background: msg.type === "ok" ? "#f0fdf4" : "#fef2f2", color: msg.type === "ok" ? "#16a34a" : "#dc2626", border: `1px solid ${msg.type === "ok" ? "#bbf7d0" : "#fecaca"}` }}>{msg.text}</p>}
        </div>
        <div style={footerStyle}>
          <button onClick={onClose} style={cancelBtnStyle}>Hủy</button>
          <button onClick={handleSubmit} disabled={saving} style={{ ...primaryBtnStyle, background: "#16a34a", opacity: saving ? 0.6 : 1 }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#15803d"; }}
            onMouseLeave={e => e.currentTarget.style.background = "#16a34a"}>
            {saving ? "Đang gửi..." : "Gửi góp ý"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
