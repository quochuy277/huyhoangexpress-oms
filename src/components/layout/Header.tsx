"use client";

import { logoutAction } from "@/lib/actions/auth-actions";
import type { Role } from "@prisma/client";
import { Bell, LogOut, User, ChevronDown, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

export function Header({ userName, userEmail, userRole, pageTitle }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueItems, setOverdueItems] = useState<any[]>([]);

  // Fetch overdue count for bell badge
  useEffect(() => {
    const fetchOverdue = () => {
      fetch("/api/todos/overdue-count").then(r => r.json()).then(d => setOverdueCount(d.count || 0)).catch(() => {});
    };
    fetchOverdue();
    const interval = setInterval(fetchOverdue, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch overdue items when bell opens
  useEffect(() => {
    if (bellOpen) {
      fetch("/api/todos/reminders").then(r => r.json()).then(d => {
        setOverdueItems(d.overdue?.items || []);
      }).catch(() => {});
    }
  }, [bellOpen]);

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
            {overdueCount > 0 && (
              <span style={{
                position: "absolute", top: "2px", right: "2px",
                background: "#dc2626", color: "#fff", fontSize: "10px", fontWeight: 700,
                borderRadius: "50%", minWidth: "16px", height: "16px",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 4px", lineHeight: 1,
              }}>
                {overdueCount > 9 ? "9+" : overdueCount}
              </span>
            )}
          </button>

          {/* Bell dropdown */}
          {bellOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-20" style={{ overflow: "hidden" }}>
                <div className="px-4 py-3 border-b border-slate-100 font-semibold text-sm text-slate-800">
                  Thông báo
                </div>
                <div className="max-h-64 overflow-auto">
                  {overdueCount === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-400">Không có công việc quá hạn 🎉</div>
                  ) : (
                    <>
                      <div className="px-4 py-2 text-xs font-bold text-red-600">
                        🔴 {overdueCount} công việc quá hạn
                      </div>
                      {overdueItems.map((item: any) => (
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
                  )}
                </div>
                <button
                  onClick={() => { setBellOpen(false); router.push("/todos?dueFilter=overdue"); }}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border-t border-slate-100 transition-colors flex items-center justify-center gap-1"
                >
                  Xem tất cả <ExternalLink size={11} />
                </button>
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
                  onClick={() => setMenuOpen(false)}
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
    </header>
  );
}
