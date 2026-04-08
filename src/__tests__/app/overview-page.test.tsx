import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cached-session", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/dashboard-overview-data", () => ({
  getDashboardSummaryData: vi.fn(),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/components/dashboard/AlertCardsRow", () => ({
  AlertCardsRow: () => null,
}));

vi.mock("@/components/dashboard/FinanceCardsRow", () => ({
  FinanceCardsRow: () => null,
}));

vi.mock("@/components/dashboard/ActivityAndRatesRow", () => ({
  ActivityAndRatesRow: () => null,
}));

import { getCachedSession } from "@/lib/cached-session";
import { getDashboardSummaryData } from "@/lib/dashboard-overview-data";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches dashboard summary data on the server", async () => {
    vi.mocked(getCachedSession).mockResolvedValue({
      user: {
        name: "Nhân viên A",
        role: "MANAGER",
      },
    } as never);
    vi.mocked(getDashboardSummaryData).mockResolvedValue({ todayOrderCount: 0 } as never);

    const { default: DashboardPage } = await import("@/app/(dashboard)/overview/page");

    const element = await DashboardPage();
    const children = (element as any).props.children;

    expect(vi.mocked(getDashboardSummaryData)).toHaveBeenCalledTimes(1);
    expect(children[1].props.initialSummaryData).toEqual({ todayOrderCount: 0 });
    expect(children[2].props.initialSummaryData).toEqual({ todayOrderCount: 0 });
    expect(children[5].props.initialSummaryData).toEqual({ todayOrderCount: 0 });
  }, 120000);
});
