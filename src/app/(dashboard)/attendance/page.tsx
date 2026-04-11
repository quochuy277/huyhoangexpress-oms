import { getCachedSession } from "@/lib/cached-session";
import { redirect } from "next/navigation";
import AttendancePageClient from "@/components/attendance/AttendancePageClient";
import { getAttendanceBootstrapData } from "@/lib/attendance-page-data";

export default async function AttendancePage() {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");

  const { id, role, permissions } = session.user;

  const canViewAll = role === "ADMIN" || !!permissions?.canViewAllAttendance;
  const canEdit = role === "ADMIN" || !!permissions?.canEditAttendance;
  const initialMyTabData = await getAttendanceBootstrapData({ userId: id });

  return (
    <AttendancePageClient
      userId={id}
      userRole={role}
      userName={session.user.name || ""}
      canViewAll={!!canViewAll}
      canEdit={!!canEdit}
      initialMyTabData={initialMyTabData}
    />
  );
}
