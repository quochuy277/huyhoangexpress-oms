import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cached-session", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/returns-page-data", () => ({
  getReturnsSummaryData: vi.fn(),
  getReturnsTabData: vi.fn(),
}));

vi.mock("@/components/returns/ReturnsPageClient", () => ({
  ReturnsPageClient: () => null,
}));

import { getCachedSession } from "@/lib/cached-session";
import { getReturnsSummaryData, getReturnsTabData } from "@/lib/returns-page-data";

describe("ReturnsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches summary and the active tab on the server", async () => {
    vi.mocked(getCachedSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(getReturnsSummaryData).mockResolvedValue({ partial: 1, full: 2, warehouse: 3 } as never);
    vi.mocked(getReturnsTabData).mockResolvedValue([{ requestCode: "REQ-001" }] as never);

    const { default: ReturnsPage } = await import("@/app/(dashboard)/returns/page");

    const element = await ReturnsPage({ searchParams: Promise.resolve({ tab: "full" }) } as never);

    expect(vi.mocked(getReturnsSummaryData)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getReturnsTabData)).toHaveBeenCalledWith({ tab: "full", search: "", page: 1, pageSize: 50 });
    expect((element as any).props.initialActiveTab).toBe("full");
    expect((element as any).props.initialTabData.full).toEqual([{ requestCode: "REQ-001" }]);
    expect((element as any).props.initialSummaryCounts).toEqual({ partial: 1, full: 2, warehouse: 3 });
  });
});
