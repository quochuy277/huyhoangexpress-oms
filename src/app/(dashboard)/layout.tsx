import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import type { Role } from "@prisma/client";
import type { PermissionSet } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { name, email, role, permissions } = session.user;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <Sidebar userRole={role as Role} permissions={permissions as PermissionSet} />

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          userName={name ?? "Người dùng"}
          userEmail={email ?? ""}
          userRole={role as Role}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
