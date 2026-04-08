import { getCachedSession } from "@/lib/cached-session";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import HeartbeatProvider from "@/components/providers/HeartbeatProvider";
import type { Role } from "@prisma/client";
import type { PermissionSet } from "@/lib/permissions";
import { DashboardProviders } from "./providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();

  if (!session?.user) {
    redirect("/login");
  }

  const { name, email, role, permissions } = session.user;

  return (
    <DashboardProviders>
      <DashboardShell
        userName={name ?? "Người dùng"}
        userEmail={email ?? ""}
        userRole={role as Role}
        permissions={permissions as PermissionSet}
      >
        <HeartbeatProvider />
        {children}
      </DashboardShell>
    </DashboardProviders>
  );
}
