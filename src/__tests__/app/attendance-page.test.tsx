import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cached-session", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/attendance-page-data", () => ({
  getAttendanceBootstrapData: vi.fn(),
}));

vi.mock("@/components/attendance/AttendancePageClient", () => ({
  default: () => null,
}));

import { getCachedSession } from "@/lib/cached-session";
import { getAttendanceBootstrapData } from "@/lib/attendance-page-data";

describe("AttendancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches bootstrap data for the default attendance tab", async () => {
    vi.mocked(getCachedSession).mockResolvedValue({
      user: {
        id: "user-1",
        role: "STAFF",
        name: "Nhân viên A",
        permissions: {
          canViewAllAttendance: false,
          canEditAttendance: false,
        },
      },
    } as never);
    vi.mocked(getAttendanceBootstrapData).mockResolvedValue({
      attendance: [],
      stats: null,
      loginHistory: [],
      historyPagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      leaveRequests: [],
    } as never);

    const { default: AttendancePage } = await import("@/app/(dashboard)/attendance/page");

    const element = await AttendancePage({} as never);

    expect(vi.mocked(getAttendanceBootstrapData)).toHaveBeenCalledTimes(1);
    expect((element as any).props.initialMyTabData).toEqual({
      attendance: [],
      stats: null,
      loginHistory: [],
      historyPagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      leaveRequests: [],
    });
  });
});
