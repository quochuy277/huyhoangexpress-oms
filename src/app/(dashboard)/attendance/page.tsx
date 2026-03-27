import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AttendancePageClient from "@/components/attendance/AttendancePageClient";

export default async function AttendancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id, role, permissions } = session.user;

  const canViewAll = role === "ADMIN" || role === "MANAGER" || permissions?.canViewAllAttendance;
  const canEdit = role === "ADMIN" || role === "MANAGER" || permissions?.canEditAttendance;

  return (
    <AttendancePageClient
      userId={id}
      userRole={role}
      userName={session.user.name || ""}
      canViewAll={!!canViewAll}
      canEdit={!!canEdit}
    />
  );
}
