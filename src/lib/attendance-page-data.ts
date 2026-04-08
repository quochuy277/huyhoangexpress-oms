import { prisma } from "@/lib/prisma";
import type { AttendanceBootstrapData } from "@/lib/attendance-bootstrap-state";

type AttendanceBootstrapOptions = {
  userId: string;
  month?: string;
  historyPage?: number;
  historyPageSize?: number;
};

export async function getAttendanceBootstrapData({
  userId,
  month = new Date().toISOString().slice(0, 7),
  historyPage = 1,
  historyPageSize = 20,
}: AttendanceBootstrapOptions): Promise<AttendanceBootstrapData> {
  const [year, mon] = month.split("-").map(Number);
  const attendanceFrom = new Date(Date.UTC(year, mon - 1, 1));
  const attendanceTo = new Date(Date.UTC(year, mon, 0, 23, 59, 59));
  const historyFrom = new Date(year, mon - 1, 1);
  const historyTo = new Date(year, mon, 0, 23, 59, 59);

  const [attendance, historyRows, historyTotal, leaveRequests] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId, date: { gte: attendanceFrom, lte: attendanceTo } },
      orderBy: { date: "asc" },
    }),
    prisma.loginHistory.findMany({
      where: { userId, loginTime: { gte: historyFrom, lte: historyTo } },
      orderBy: { loginTime: "desc" },
      skip: (historyPage - 1) * historyPageSize,
      take: historyPageSize,
    }),
    prisma.loginHistory.count({
      where: { userId, loginTime: { gte: historyFrom, lte: historyTo } },
    }),
    prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const present = attendance.filter((item) => item.status === "PRESENT").length;
  const halfDay = attendance.filter((item) => item.status === "HALF_DAY").length;
  const absent = attendance.filter((item) => item.status === "ABSENT").length;
  const onLeave = attendance.filter((item) => item.status === "ON_LEAVE").length;
  const lateCount = attendance.filter((item) => item.isLate).length;
  const totalMinutes = attendance.reduce((sum, item) => sum + item.totalMinutes, 0);

  return {
    attendance,
    stats: {
      present,
      halfDay,
      absent,
      onLeave,
      lateCount,
      totalMinutes,
      equivalent: present + halfDay * 0.5,
    },
    loginHistory: historyRows,
    historyPagination: {
      page: historyPage,
      pageSize: historyPageSize,
      total: historyTotal,
      totalPages: Math.ceil(historyTotal / historyPageSize),
    },
    leaveRequests,
  };
}
