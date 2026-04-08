import { describe, expect, it } from "vitest";

import { shouldFetchAttendanceBootstrap } from "@/lib/attendance-bootstrap-state";

describe("shouldFetchAttendanceBootstrap", () => {
  it("skips the first client fetch when server bootstrap data exists", () => {
    expect(
      shouldFetchAttendanceBootstrap({
        attendance: [],
        stats: null,
        loginHistory: [],
        historyPagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        leaveRequests: [],
      }),
    ).toBe(false);
  });

  it("allows client fetch when there is no bootstrap data", () => {
    expect(shouldFetchAttendanceBootstrap(null)).toBe(true);
  });
});
