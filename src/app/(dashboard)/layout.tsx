import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
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
    <DashboardShell
      userName={name ?? "Người dùng"}
      userEmail={email ?? ""}
      userRole={role as Role}
      permissions={permissions as PermissionSet}
    >
      {children}
    </DashboardShell>
  );
}
