import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSession() {
  return {
    user: {
      id: "manager-1",
      role: "MANAGER",
      permissions: {
        canViewAllAttendance: true,
      },
    },
  };
}

describe("attendance export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns CSV with Server-Timing header", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession() as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "user-1",
        name: "Tester",
        attendances: [
          {
            status: "PRESENT",
            isLate: false,
            totalMinutes: 480,
          },
        ],
      },
    ] as never);

    const { GET } = await import("@/app/api/attendance/export/route");
    const response = await GET(new NextRequest("http://localhost/api/attendance/export?month=2026-04"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Server-Timing")).toContain("total;dur=");
    expect(body).toContain("Tester");
    expect(vi.mocked(prisma.user.findMany)).toHaveBeenCalled();
  }, 30_000);
});
