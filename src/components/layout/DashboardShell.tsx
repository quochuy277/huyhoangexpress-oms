"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import IdleLogoutProvider from "@/components/attendance/IdleLogoutProvider";
import type { Role } from "@prisma/client";
import type { PermissionSet } from "@/lib/permissions";

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userRole: Role;
  permissions: PermissionSet;
}

export function DashboardShell({ children, userName, userEmail, userRole, permissions }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        userRole={userRole}
        permissions={permissions}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <IdleLogoutProvider>
            {children}
          </IdleLogoutProvider>
        </main>
      </div>
    </div>
  );
}
