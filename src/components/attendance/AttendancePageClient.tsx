"use client";

import AttendancePageWrapper from "./AttendancePageWrapper";

interface Props {
  userId: string;
  userRole: string;
  userName: string;
  canViewAll: boolean;
  canEdit: boolean;
}

export default function AttendancePageClient(props: Props) {
  return <AttendancePageWrapper {...props} />;
}
