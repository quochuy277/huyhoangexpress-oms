"use client";

import { logoutAction } from "@/lib/actions/auth-actions";
import type { Role } from "@prisma/client";
import { Bell, LogOut, User, ChevronDown, ExternalLink, Pin, Paperclip } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserProfileDialog } from "@/components/shared/UserProfileDialog";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  STAFF: "Nhân viên",
  VIEWER: "Xem",
};

const ROLE_BADGE_COLORS: Record<Role, string> = {
  ADMIN: "bg-red-100 text-red-700",
  MANAGER: "bg-purple-100 text-purple-700",
  STAFF: "bg-blue-100 text-blue-700",
  VIEWER: "bg-gray-100 text-gray-700",
};

interface HeaderProps {
  userName: string;
  userEmail: string;
  userRole: Role;
  pageTitle?: string;
}

interface AnnouncementPreview {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  attachmentName: string | null;
  createdByName: string;
  createdAt: string;
  isRead: boolean;
}

export function Header({ userName, userEmail, userRole, pageTitle }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [bellTab, setBellTab] = useState<"todos" | "announcements">("todos");
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueItems, setOverdueItems] = useState<{ id: string; title: string; daysOverdue: number }[]>([]);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [announcements, setAnnouncements] = useState<AnnouncementPreview[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);

  // Fetch overdue + announcement counts for bell badge
  useEffect(() => {
    const fetchCounts = () => {
      fetch("/api/todos/overdue-count").then(r => r.json()).then(d => setOverdueCount(d.count || 0)).catch(() => {});
      fetch("/api/announcements/unread-count").then(r => r.json()).then(d => setAnnouncementCount(d.count || 0)).catch(() => {});
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch details when bell opens
  useEffect(() => {
    if (bellOpen) {
      fetch("/api/todos/reminders").then(r => r.json()).then(d => {
        setOverdueItems(d.overdue?.items || []);
      }).catch(() => {});
      fetch("/api/announcements?pageSize=10").then(r => r.json()).then(d => {
        setAnnouncements(d.announcements || []);
      }).catch(() => {});
    }
  }, [bellOpen]);

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/announcements/${id}/read`, { method: "POST" }).catch(() => {});
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    setAnnouncementCount(prev => Math.max(0, prev - 1));
  };

  const totalBadge = overdueCount + announcementCount;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      {/* Page title */}
      <div>
        {pageTitle && (
          <h1 className="text-lg font-semibold text-slate-800">{pageTitle}</h1>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => { setBellOpen(!bellOpen); setMenuOpen(false); }}
            className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {totalBadge > 0 && (
              <span style={{
                position: "absolute", top: "2px", right: "2px",
                background: "#dc2626", color: "#fff", fontSize: "10px", fontWeight: 700,
                borderRadius: "50%", minWidth: "16px", height: "16px",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 4px", lineHeight: 1,
              }}>
                {totalBadge > 9 ? "9+" : totalBadge}
              </span>
            )}
          </button>

          {/* Bell dropdown */}
          {bellOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-20" style={{ overflow: "hidden" }}>
                {/* Tab bar */}
                <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
                  <button onClick={() => setBellTab("todos")} style={{
                    flex: 1, padding: "10px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer",
                    background: bellTab === "todos" ? "#fff" : "#f9fafb",
                    color: bellTab === "todos" ? "#2563EB" : "#6b7280",
                    borderBottom: bellTab === "todos" ? "2px solid #2563EB" : "2px solid transparent",
                  }}>
                    Công việc {overdueCount > 0 && <span style={{ background: "#dc2626", color: "#fff", borderRadius: "8px", padding: "1px 6px", fontSize: "10px", marginLeft: "4px" }}>{overdueCount}</span>}
                  </button>
                  <button onClick={() => setBellTab("announcements")} style={{
                    flex: 1, padding: "10px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer",
                    background: bellTab === "announcements" ? "#fff" : "#f9fafb",
                    color: bellTab === "announcements" ? "#2563EB" : "#6b7280",
                    borderBottom: bellTab === "announcements" ? "2px solid #2563EB" : "2px solid transparent",
                  }}>
                    Thông báo {announcementCount > 0 && <span style={{ background: "#d97706", color: "#fff", borderRadius: "8px", padding: "1px 6px", fontSize: "10px", marginLeft: "4px" }}>{announcementCount}</span>}
                  </button>
                </div>

                <div className="max-h-72 overflow-auto">
                  {bellTab === "todos" ? (
                    /* Todos tab */
                    overdueCount === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-slate-400">Không có công việc quá hạn 🎉</div>
                    ) : (
                      <>
                        <div className="px-4 py-2 text-xs font-bold text-red-600">
                          🔴 {overdueCount} công việc quá hạn
                        </div>
                        {overdueItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { setBellOpen(false); router.push("/todos?dueFilter=overdue"); }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors border-b border-slate-50"
                          >
                            <div className="text-xs text-slate-700 font-medium">• {item.title}</div>
                            <div className="text-xs text-red-500 mt-0.5">quá {item.daysOverdue} ngày</div>
                          </button>
                        ))}
                      </>
                    )
                  ) : (
                    /* Announcements tab */
                    announcements.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-slate-400">Không có thông báo 📢</div>
                    ) : (
                      announcements.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => { handleMarkRead(a.id); }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50"
                          style={{ background: a.isRead ? "transparent" : "#fffbeb" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {a.isPinned && <Pin style={{ width: "10px", height: "10px", color: "#d97706", transform: "rotate(45deg)" }} />}
                            {!a.isRead && <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#d97706", flexShrink: 0 }} />}
                            <span className="text-xs text-slate-800 font-semibold truncate">{a.title}</span>
                            {a.attachmentName && <Paperclip style={{ width: "10px", height: "10px", color: "#9ca3af" }} />}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 truncate" dangerouslySetInnerHTML={{ __html: a.content.replace(/<[^>]*>/g, " ").substring(0, 80) }} />
                          <div className="text-xs text-slate-400 mt-1">{new Date(a.createdAt).toLocaleDateString("vi-VN")} • {a.createdByName}</div>
                        </button>
                      ))
                    )
                  )}
                </div>

                {bellTab === "todos" ? (
                  <button
                    onClick={() => { setBellOpen(false); router.push("/todos?dueFilter=overdue"); }}
                    className="w-full px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors flex items-center justify-center gap-1"
                  >
                    Xem tất cả <ExternalLink size={11} />
                  </button>
                ) : (
                  <div className="px-4 py-2 text-center text-xs text-slate-400 border-t border-slate-100">
                    Thông báo từ công ty
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setMenuOpen(!menuOpen); setBellOpen(false); }}
            className="flex items-center gap-3 pl-3 pr-2 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>

            {/* Name + role */}
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-800 leading-tight">
                {userName}
              </p>
              <span
                className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_BADGE_COLORS[userRole]}`}
              >
                {ROLE_LABELS[userRole]}
              </span>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1">
                {/* User info */}
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">
                    {userName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                </div>

                {/* Profile */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => { setMenuOpen(false); setProfileOpen(true); }}
                >
                  <User className="w-4 h-4 text-slate-400" />
                  Thông tin cá nhân
                </button>

                {/* Logout */}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Profile Dialog */}
      {profileOpen && <UserProfileDialog onClose={() => setProfileOpen(false)} />}
    </header>
  );
}
