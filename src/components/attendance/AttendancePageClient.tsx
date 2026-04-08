"use client";

import AttendancePageWrapper from "./AttendancePageWrapper";
import type { AttendanceBootstrapData } from "@/lib/attendance-bootstrap-state";

interface Props {
  userId: string;
  userRole: string;
  userName: string;
  canViewAll: boolean;
  canEdit: boolean;
  initialMyTabData: AttendanceBootstrapData | null;
}

export default function AttendancePageClient(props: Props) {
  return <AttendancePageWrapper {...props} />;
}
