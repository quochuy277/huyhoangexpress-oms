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

// NOTE: Attendance.date uses @db.Date which stores date-only in UTC.
// These helpers create UTC midnight dates matching the Vietnam calendar date.
export function startOfDayVN(date: Date): Date {
  // Get Vietnam date components
  const vnStr = date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const vn = new Date(vnStr);
  // Create UTC midnight for the Vietnam calendar date
  return new Date(Date.UTC(vn.getFullYear(), vn.getMonth(), vn.getDate(), 0, 0, 0, 0));
}

export function endOfDayVN(date: Date): Date {
  const vnStr = date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  const vn = new Date(vnStr);
  return new Date(Date.UTC(vn.getFullYear(), vn.getMonth(), vn.getDate(), 23, 59, 59, 999));
}

// ============================================================
// RECALCULATE ATTENDANCE
// ============================================================
export async function recalculateAttendance(userId: string, date: Date) {
  const settings = await getAttendanceSettings();
  const dayStart = startOfDayVN(date);
  const dayEnd = endOfDayVN(date);

  // Find sessions that overlap with this day:
  // - Sessions that started on this day  
  // - Sessions that started before but have no logout (still active) or logout after dayStart
  const sessions = await prisma.loginHistory.findMany({
    where: {
      userId,
      loginTime: { lte: dayEnd },
      OR: [
        { loginTime: { gte: dayStart } },
        { logoutTime: { gte: dayStart } },
        { logoutTime: null },
      ],
    },
    orderBy: { loginTime: "asc" },
  });

  const now = new Date();
  const totalMinutes = sessions.reduce((sum, s) => {
    // Clamp session boundaries to the day
    const sessionStart = new Date(Math.max(s.loginTime.getTime(), dayStart.getTime()));
    const sessionEnd = s.logoutTime
      ? new Date(Math.min(s.logoutTime.getTime(), dayEnd.getTime()))
      : new Date(Math.min(now.getTime(), dayEnd.getTime())); // Cap active sessions to end of day

    // Only count if session end is after session start
    if (sessionEnd <= sessionStart) return sum;

    const dur = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 60000);
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

  // Find first login OF THIS DAY (not from previous day)
  const todaySessions = sessions.filter(s => s.loginTime >= dayStart && s.loginTime <= dayEnd);
  const firstLogin = todaySessions[0]?.loginTime || null;
  const lastSession = todaySessions[todaySessions.length - 1];
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

// ============================================================
// CLOSE ORPHANED SESSIONS (browser closed without logout)
// ============================================================
export async function closeOrphanedSessions(userId: string) {
  const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  const now = new Date();

  // Find active sessions with stale heartbeat (or no heartbeat)
  const staleSessions = await prisma.loginHistory.findMany({
    where: {
      userId,
      logoutTime: null,
      OR: [
        { lastHeartbeat: { lt: new Date(now.getTime() - STALE_THRESHOLD_MS) } },
        { lastHeartbeat: null, loginTime: { lt: new Date(now.getTime() - STALE_THRESHOLD_MS) } },
      ],
    },
  });

  for (const session of staleSessions) {
    const logoutTime = session.lastHeartbeat || new Date(session.loginTime.getTime() + 60000);
    const duration = Math.floor((logoutTime.getTime() - session.loginTime.getTime()) / 60000);
    await prisma.loginHistory.update({
      where: { id: session.id },
      data: {
        logoutTime,
        duration: Math.max(0, duration),
        logoutReason: "browser_closed",
      },
    });

    // Recalculate attendance for the day of this session
    const sessionDay = new Date(session.loginTime.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    sessionDay.setHours(0, 0, 0, 0);
    await recalculateAttendance(userId, sessionDay);
  }

  return staleSessions.length;
}

