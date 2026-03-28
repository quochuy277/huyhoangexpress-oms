import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function makeSession(canViewClaims = true) {
  return {
    user: {
      id: "user-1",
      name: "Tester",
      role: "STAFF",
      permissions: {
        canViewClaims,
        canCreateClaim: false,
        canUpdateClaim: false,
        canDeleteClaim: false,
        canViewCompensation: false,
      },
    },
  };
}

describe("claims history route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ total: 0 }] as never)
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([] as never);
  });

  it("rejects GET /api/claims/history when canViewClaims is false", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession(false) as never);
    const { GET } = await import("@/app/api/claims/history/route");

    const response = await GET(
      new NextRequest("http://localhost/api/claims/history?action=auto", { method: "GET" }),
    );

    expect(response.status).toBe(403);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("queries the merged activity feed with database pagination", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession(true) as never);
    vi.mocked(prisma.$queryRaw as any).mockReset();
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ total: 3 }] as never)
      .mockResolvedValueOnce([
        {
          id: "cl-2",
          claimId: "claim-2",
          timestamp: new Date("2026-03-27T10:00:00.000Z"),
          staff: "Tester",
          requestCode: "REQ-002",
          action: "Cập nhật",
          detail: "A → B",
          dotColor: "blue",
          actionType: "Cập nhật",
        },
      ] as never)
      .mockResolvedValueOnce([{ staff: "Tester" }] as never);
    const { GET } = await import("@/app/api/claims/history/route");

    const response = await GET(
      new NextRequest("http://localhost/api/claims/history?page=2&pageSize=1", { method: "GET" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activities).toEqual([
      expect.objectContaining({
        id: "cl-2",
        requestCode: "REQ-002",
      }),
    ]);
    expect(body.pagination).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 3,
      totalPages: 3,
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(3);
  });

  it("adds system-only predicates when filtering auto activities", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession(true) as never);
    vi.mocked(prisma.$queryRaw as any).mockReset();
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ total: 1 }] as never)
      .mockResolvedValueOnce([
        {
          id: "sh-1",
          claimId: "claim-1",
          timestamp: new Date("2026-03-28T10:00:00.000Z"),
          staff: "Hệ thống",
          requestCode: "REQ-001",
          action: "Chuyển trạng thái",
          detail: "VERIFYING_CARRIER → RESOLVED",
          dotColor: "yellow",
          actionType: "Chuyển trạng thái",
        },
      ] as never)
      .mockResolvedValueOnce([{ staff: "Hệ thống" }] as never);
    const { GET } = await import("@/app/api/claims/history/route");

    const response = await GET(
      new NextRequest("http://localhost/api/claims/history?action=auto", { method: "GET" }),
    );
    const body = await response.json();
    const dataQuery = vi.mocked(prisma.$queryRaw as any).mock.calls[1]?.[0];
    const sqlText = Array.isArray(dataQuery?.strings) ? dataQuery.strings.join(" ") : "";

    expect(response.status).toBe(200);
    expect(body.activities).toHaveLength(1);
    expect(sqlText).toContain(`sh."changedBy" =`);
    expect(dataQuery.values).toEqual(
      expect.arrayContaining(["Hệ thống", "%Tự động%"]),
    );
  });
});
