"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";
import type { PermissionSet } from "@/lib/permissions";
import {
  LayoutDashboard,
  Package,
  AlertCircle,
  RotateCcw,
  FileWarning,
  CheckSquare,
  Clock,
  BarChart2,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredPermission?: keyof PermissionSet;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tổng Quan", icon: LayoutDashboard },
  { href: "/orders", label: "Quản Lý Đơn Hàng", icon: Package, requiredPermission: "canViewOrders" },
  { href: "/delayed", label: "Chăm Sóc Đơn Hoãn", icon: AlertCircle, requiredPermission: "canViewDelayed" },
  { href: "/returns", label: "Theo Dõi Đơn Hoàn", icon: RotateCcw, requiredPermission: "canViewReturns" },
  { href: "/claims", label: "Bồi Hoàn / Khiếu Nại", icon: FileWarning, requiredPermission: "canViewClaims" },
  { href: "/todos", label: "Công Việc", icon: CheckSquare },
  { href: "/attendance", label: "Chấm Công", icon: Clock },
  { href: "/finance", label: "Tài Chính", icon: BarChart2, requiredPermission: "canViewFinancePage" },
  { href: "/admin/users", label: "Quản Lý Nhân Viên", icon: Users, requiredPermission: "canManageUsers" },
];

interface SidebarProps {
  userRole: Role;
  permissions?: PermissionSet;
}

export function Sidebar({ userRole, permissions }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load saved state on mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleCollapse = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem("sidebar_collapsed", JSON.stringify(newVal));
  };

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredPermission) return true;
    if (permissions) return permissions[item.requiredPermission];
    // Fallback to old role check if permissions not provided
    if (item.requiredPermission === "canManageUsers") return userRole === "ADMIN";
    if (item.requiredPermission === "canViewFinancePage") return userRole === "ADMIN" || userRole === "MANAGER";
    return true;
  });

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300 relative",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn("flex items-center h-16 px-4 border-b border-slate-800 overflow-hidden", collapsed ? "justify-center cursor-pointer hover:bg-slate-800 transition-colors" : "")}
        onClick={() => collapsed && toggleCollapse()}
        title={collapsed ? "Mở rộng" : undefined}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0">
          <Package className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="ml-3 overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight truncate">
              HuyHoang Express
            </p>
            <p className="text-slate-500 text-xs truncate">Quản lý vận chuyển</p>
          </div>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center mt-4">
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Mở rộng"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-transform",
                  !isActive && "group-hover:scale-110"
                )}
              />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse button */}
      {!collapsed && (
        <div className="px-2 pb-4">
          <button
            onClick={toggleCollapse}
            className="flex items-center justify-center w-full gap-2 py-2.5 px-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all text-sm"
            title="Thu gọn"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Thu gọn</span>
          </button>
        </div>
      )}
    </aside>
  );
}
