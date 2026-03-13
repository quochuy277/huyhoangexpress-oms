"use client";

import { logoutAction } from "@/lib/actions/auth-actions";
import type { Role } from "@prisma/client";
import { Bell, LogOut, User, ChevronDown } from "lucide-react";
import { useState } from "react";

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
  const [menuOpen, setMenuOpen] = useState(false);

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
        {/* Notification bell placeholder */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
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
