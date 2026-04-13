"use client";

import { useState, useEffect, useRef } from "react";
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
  Pin,
  PinOff,
  X,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  requiredPermission?: keyof PermissionSet;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/overview", label: "Tổng Quan", icon: LayoutDashboard },
  { href: "/orders", label: "Quản Lý Đơn Hàng", icon: Package, requiredPermission: "canViewOrders" },
  { href: "/delayed", label: "Chăm Sóc Đơn Hoãn", icon: AlertCircle, requiredPermission: "canViewDelayed" },
  { href: "/returns", label: "Theo Dõi Đơn Hoàn", icon: RotateCcw, requiredPermission: "canViewReturns" },
  { href: "/claims", label: "Bồi Hoàn / Khiếu Nại", icon: FileWarning, requiredPermission: "canViewClaims" },
  { href: "/todos", label: "Công Việc", icon: CheckSquare },
  { href: "/attendance", label: "Chấm Công", icon: Clock },
  { href: "/crm", label: "Quản Lý KH", icon: Users, requiredPermission: "canViewCRM" },
  { href: "/finance", label: "Tài Chính", icon: BarChart2, requiredPermission: "canViewFinancePage" },
  { href: "/admin/users", label: "Quản Lý Nhân Viên", icon: Users, requiredPermission: "canManageUsers" },
];

interface SidebarProps {
  userRole: Role;
  permissions?: PermissionSet;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ userRole, permissions, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // pinned = user explicitly chose to keep sidebar expanded (persisted)
  const [pinned, setPinned] = useState(false);
  // hovered = mouse is over the sidebar area (transient)
  const [hovered, setHovered] = useState(false);

  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar_pinned");
    if (saved === "true") {
      setPinned(true);
    }
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePin = () => {
    const newVal = !pinned;
    setPinned(newVal);
    localStorage.setItem("sidebar_pinned", JSON.stringify(newVal));
    if (newVal) setHovered(false); // no need for hover state when pinned
  };

  const handleMouseEnter = () => {
    if (pinned) return; // already expanded
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setHovered(true);
  };

  const handleMouseLeave = () => {
    if (pinned) return;
    // Small delay to prevent flicker
    hoverTimeout.current = setTimeout(() => setHovered(false), 150);
  };

  // Determine if sidebar content should show expanded
  const isExpanded = pinned || hovered;

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredPermission) return true;
    if (userRole === "ADMIN") return true;
    return !!permissions?.[item.requiredPermission];
  });

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-slate-800 overflow-hidden shrink-0",
          !isMobile && !isExpanded ? "justify-center" : ""
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0">
          <Package className="w-5 h-5 text-white" />
        </div>
        {(isMobile || isExpanded) && (
          <div className="ml-3 overflow-hidden flex-1">
            <p className="text-white font-bold text-sm leading-tight truncate">
              HuyHoang Express
            </p>
            <p className="text-slate-500 text-xs truncate">Quản lý vận chuyển</p>
          </div>
        )}
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={!isMobile && !isExpanded ? item.label : undefined}
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
              {(isMobile || isExpanded) && (
                <span className="truncate whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pin/Unpin button - desktop only */}
      {!isMobile && (
        <div className="px-2 pb-4 shrink-0">
          <button
            onClick={togglePin}
            className="flex items-center justify-center w-full gap-2 py-2.5 px-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all text-sm"
            title={pinned ? "Bỏ ghim (thu gọn)" : "Ghim mở rộng"}
          >
            {pinned ? (
              <>
                <PinOff className="w-4 h-4" />
                {isExpanded && <span>Bỏ ghim</span>}
              </>
            ) : isExpanded ? (
              <>
                <Pin className="w-4 h-4" />
                <span>Ghim mở rộng</span>
              </>
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      {/* Spacer div only when not pinned (sidebar is fixed/overlay) */}
      {!pinned && (
        <div className="hidden md:block shrink-0 w-16" />
      )}

      {/* Actual sidebar - fixed when collapsed (overlay on hover), relative when pinned */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "hidden md:flex flex-col h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300 shrink-0",
          pinned
            ? "relative w-64"
            : "fixed left-0 top-0 z-40",
          !pinned && (hovered ? "w-64 shadow-2xl shadow-black/30" : "w-16")
        )}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <aside className="fixed inset-y-0 left-0 w-72 bg-slate-900 z-50 md:hidden flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent(true)}
          </aside>
        </>
      )}
    </>
  );
}
