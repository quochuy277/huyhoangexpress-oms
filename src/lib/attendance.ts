import { prisma } from "@/lib/prisma";

// ============================================================
// ATTENDANCE SETTINGS
// ============================================================
export interface AttendanceSettings {
  lateTime: string;       // "08:30"
  autoLogout: string;     // "00:00"
  idleTimeout: number;    // minutes
  fullDayHours: number;
  halfDayHours: number;
  timezone: string;
}

const DEFAULTS: Record<string, string> = {
  attendance_late_time: "08:30",
  attendance_auto_logout: "00:00",
  attendance_idle_timeout: "60",
  attendance_full_day_hours: "4",
  attendance_half_day_hours: "2",
  attendance_timezone: "Asia/Ho_Chi_Minh",
};

export async function getAttendanceSettings(): Promise<AttendanceSettings> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { startsWith: "attendance_" } },
  });
  const map = new Map(rows.map(r => [r.key, r.value]));
  const get = (k: string) => map.get(k) || DEFAULTS[k] || "";

  return {
    lateTime: get("attendance_late_time"),
    autoLogout: get("attendance_auto_logout"),
    idleTimeout: parseInt(get("attendance_idle_timeout")) || 60,
    fullDayHours: parseFloat(get("attendance_full_day_hours")) || 4,
    halfDayHours: parseFloat(get("attendance_half_day_hours")) || 2,
    timezone: get("attendance_timezone"),
  };
}

// ============================================================
// DEVICE TYPE PARSING
// ============================================================
export function parseDeviceType(ua: string): string {
  let browser = "Unknown";
  let os = "Unknown";
  if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh")) os = "MacOS";
  else if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPad")) os = "iPad";
  else if (ua.includes("Linux")) os = "Linux";
  return `${browser} / ${os}`;
}

// ============================================================
// DATE HELPERS (Vietnam timezone)
// ============================================================
export function getVietnamNow(): Date {
  const now = new Date();
  const vnStr = now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  return new Date(vnStr);
}

export function getVietnamToday(): Date {
  const vn = getVietnamNow();
  vn.setHours(0, 0, 0, 0);
  return vn;
}

export function isAfterTime(date: Date, timeStr: string): boolean {
  const [h, m] = timeStr.split(":").map(Number);
  const vn = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  return vn.getHours() > h || (vn.getHours() === h && vn.getMinutes() > m);
}

export function calculateLateMinutes(date: Date, timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  const vn = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
  const lateThreshold = h * 60 + m;
  const actual = vn.getHours() * 60 + vn.getMinutes();
  return Math.max(0, actual - lateThreshold);
}

export function startOfDayVN(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDayVN(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ============================================================
// RECALCULATE ATTENDANCE
// ============================================================
export async function recalculateAttendance(userId: string, date: Date) {
  const settings = await getAttendanceSettings();
  const dayStart = startOfDayVN(date);
  const dayEnd = endOfDayVN(date);

  const sessions = await prisma.loginHistory.findMany({
    where: {
      userId,
      loginTime: { gte: dayStart, lte: dayEnd },
    },
    orderBy: { loginTime: "asc" },
  });

  const totalMinutes = sessions.reduce((sum, s) => {
    if (s.logoutTime) {
      const dur = Math.floor((s.logoutTime.getTime() - s.loginTime.getTime()) / 60000);
      return sum + Math.max(0, dur);
    }
    // Still active — count up to now
    const dur = Math.floor((Date.now() - s.loginTime.getTime()) / 60000);
    return sum + Math.max(0, dur);
  }, 0);

  const totalHours = totalMinutes / 60;

  // Check for approved leave
  const leave = await prisma.leaveRequest.findFirst({
    where: {
      userId,
      leaveStatus: "APPROVED",
      dateFrom: { lte: date },
      dateTo: { gte: date },
    },
  });

  let status: "PRESENT" | "HALF_DAY" | "ABSENT" | "ON_LEAVE" | "UNAPPROVED_LEAVE";
  if (leave) {
    status = "ON_LEAVE";
  } else if (totalHours >= settings.fullDayHours) {
    status = "PRESENT";
  } else if (totalHours >= settings.halfDayHours) {
    status = "HALF_DAY";
  } else {
    status = "ABSENT";
  }

  const firstLogin = sessions[0]?.loginTime || null;
  const lastSession = sessions[sessions.length - 1];
  const lastLogout = lastSession?.logoutTime || null;

  await prisma.attendance.upsert({
    where: { userId_date: { userId, date: dayStart } },
    create: {
      userId,
      date: dayStart,
      totalMinutes,
      status,
      firstLogin,
      lastLogout,
      isLate: firstLogin ? isAfterTime(firstLogin, settings.lateTime) : false,
      lateMinutes: firstLogin ? calculateLateMinutes(firstLogin, settings.lateTime) : 0,
    },
    update: {
      totalMinutes,
      status,
      lastLogout,
    },
  });
}

// ============================================================
// HANDLE LOGOUT
// ============================================================
export async function handleLogout(userId: string, reason: string, effectiveLogoutTime?: Date) {
  const logoutTime = effectiveLogoutTime || new Date();

  const activeSession = await prisma.loginHistory.findFirst({
    where: { userId, logoutTime: null },
    orderBy: { loginTime: "desc" },
  });

  if (activeSession) {
    const duration = Math.floor((logoutTime.getTime() - activeSession.loginTime.getTime()) / 60000);
    await prisma.loginHistory.update({
      where: { id: activeSession.id },
      data: { logoutTime, duration: Math.max(0, duration), logoutReason: reason },
    });
  }

  await recalculateAttendance(userId, getVietnamToday());
}
