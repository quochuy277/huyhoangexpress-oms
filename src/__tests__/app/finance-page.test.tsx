import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/cached-session", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/finance/landing", async () => {
  const actual = await vi.importActual<typeof import("@/lib/finance/landing")>("@/lib/finance/landing");
  return {
    ...actual,
    getFinanceLandingData: vi.fn(),
  };
});

vi.mock("@/components/finance/dashboard/DashboardPageClient", () => ({
  __esModule: true,
  default: () => null,
}));

import { getCachedSession } from "@/lib/cached-session";
import { getFinanceLandingData } from "@/lib/finance/landing";

describe("FinancePage (dashboard hub)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedSession).mockResolvedValue({
      user: {
        role: "ADMIN",
        permissions: { canViewFinancePage: true },
      },
    } as never);
  });

  it("redirects legacy ?tab=analysis to /finance/analysis", async () => {
    const { default: FinancePage } = await import("@/app/(dashboard)/finance/page");
    await expect(
      FinancePage({ searchParams: Promise.resolve({ tab: "analysis" }) }),
    ).rejects.toThrow("REDIRECT:/finance/analysis");
    expect(vi.mocked(getFinanceLandingData)).not.toHaveBeenCalled();
  }, 120000);

  it("redirects legacy ?tab=cashbook to /finance/cashbook", async () => {
    const { default: FinancePage } = await import("@/app/(dashboard)/finance/page");
    await expect(
      FinancePage({ searchParams: Promise.resolve({ tab: "cashbook" }) }),
    ).rejects.toThrow("REDIRECT:/finance/cashbook");
    expect(vi.mocked(getFinanceLandingData)).not.toHaveBeenCalled();
  });

  it("renders the dashboard and prefetches landing data by default", async () => {
    vi.mocked(getFinanceLandingData).mockResolvedValue({ summary: {}, pnl: {} } as never);

    const { default: FinancePage } = await import("@/app/(dashboard)/finance/page");
    const element = await FinancePage({ searchParams: Promise.resolve({}) });

    expect(vi.mocked(getFinanceLandingData)).toHaveBeenCalledTimes(1);
    expect((element as any).props.initialData).toEqual({ summary: {}, pnl: {} });
  });
});
