import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    claimStatusHistory: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    claimChangeLog: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
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
    vi.mocked(prisma.claimStatusHistory.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.claimChangeLog.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.claimStatusHistory.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.claimChangeLog.findMany).mockResolvedValue([] as never);
  });

  it("rejects GET /api/claims/history when canViewClaims is false", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession(false) as never);
    const { GET } = await import("@/app/api/claims/history/route");

    const response = await GET(
      new NextRequest("http://localhost/api/claims/history?action=auto", { method: "GET" }),
    );

    expect(response.status).toBe(403);
    expect(prisma.claimStatusHistory.count).not.toHaveBeenCalled();
  });

  it("adds system-only predicates when filtering auto activities", async () => {
    vi.mocked(auth).mockResolvedValue(makeSession(true) as never);
    vi.mocked(prisma.claimStatusHistory.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.claimStatusHistory.findMany).mockResolvedValue([
      {
        id: "sh-1",
        changedAt: new Date("2026-03-28T10:00:00.000Z"),
        changedBy: "Hệ thống",
        fromStatus: "VERIFYING_CARRIER",
        toStatus: "RESOLVED",
        note: "Tự động hoàn tất",
        claimOrder: {
          id: "claim-1",
          issueType: "LOST",
          order: { requestCode: "REQ-001" },
        },
      },
    ] as never);
    const { GET } = await import("@/app/api/claims/history/route");

    const response = await GET(
      new NextRequest("http://localhost/api/claims/history?action=auto", { method: "GET" }),
    );
    const body = await response.json();
    const countArgs = vi.mocked(prisma.claimStatusHistory.count).mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(body.activities).toHaveLength(1);
    expect(countArgs).toBeDefined();
    expect(countArgs?.where).toBeDefined();
    expect(countArgs?.where?.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ changedBy: "Hệ thống" }),
            expect.objectContaining({
              note: expect.objectContaining({ contains: "Tự động", mode: "insensitive" }),
            }),
          ]),
        }),
      ]),
    );
  });
});
