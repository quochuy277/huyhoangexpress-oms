import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/delayed-page-data", () => ({
  getDelayedPageData: vi.fn(),
}));

vi.mock("@/components/delayed/DelayedClient", () => ({
  DelayedClient: () => null,
}));

import { auth } from "@/lib/auth";
import { getDelayedPageData } from "@/lib/delayed-page-data";

describe("DelayedOrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches delayed data on the server for the initial route entry", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: {
        role: "STAFF",
      },
    } as never);
    vi.mocked(getDelayedPageData).mockResolvedValue({
      success: true,
      data: {
        rows: [],
        summary: {
          total: 0,
        },
        facets: {
          shops: [],
          statuses: [],
          reasons: [],
          delayDistribution: [],
          reasonDistribution: [],
        },
        pagination: {
          page: 1,
          pageSize: 50,
          total: 0,
          totalPages: 0,
        },
        meta: {
          isTruncated: false,
          scanLimit: 2000,
          warning: null,
        },
      },
    } as never);

    const { default: DelayedOrdersPage } = await import("@/app/(dashboard)/delayed/page");

    await DelayedOrdersPage({
      searchParams: Promise.resolve({}),
    } as never);

    expect(vi.mocked(getDelayedPageData)).toHaveBeenCalledTimes(1);
  });
});
