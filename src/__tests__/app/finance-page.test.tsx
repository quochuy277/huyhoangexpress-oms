import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cached-session", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/finance/page-data", () => ({
  getFinanceAnalysisInitialData: vi.fn(),
  getFinanceCashbookInitialData: vi.fn(),
}));

vi.mock("@/lib/finance/landing", async () => {
  const actual = await vi.importActual<typeof import("@/lib/finance/landing")>("@/lib/finance/landing");
  return {
    ...actual,
    getFinanceLandingData: vi.fn(),
  };
});

vi.mock("@/components/finance/FinancePageClient", () => ({
  __esModule: true,
  default: () => null,
}));

import { getCachedSession } from "@/lib/cached-session";
import { getFinanceAnalysisInitialData, getFinanceCashbookInitialData } from "@/lib/finance/page-data";

describe("FinancePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedSession).mockResolvedValue({
      user: {
        role: "ADMIN",
        permissions: { canViewFinancePage: true },
      },
    } as never);
  });

  it("prefetches analysis data when opening the analysis tab directly", async () => {
    vi.mocked(getFinanceAnalysisInitialData).mockResolvedValue({ carriers: [{ carrier: "GHN" }] } as never);

    const { default: FinancePage } = await import("@/app/(dashboard)/finance/page");
    const element = await FinancePage({ searchParams: Promise.resolve({ tab: "analysis", view: "carrier" }) });

    expect(vi.mocked(getFinanceAnalysisInitialData)).toHaveBeenCalledTimes(1);
    expect((element as any).props.initialAnalysisData).toEqual({ carriers: [{ carrier: "GHN" }] });
    expect((element as any).props.initialCashbookData).toBeNull();
  }, 120000);

  it("prefetches cashbook data when opening the cashbook tab directly", async () => {
    vi.mocked(getFinanceCashbookInitialData).mockResolvedValue({ summary: { summary: { codTotal: 0 } } } as never);

    const { default: FinancePage } = await import("@/app/(dashboard)/finance/page");
    const element = await FinancePage({ searchParams: Promise.resolve({ tab: "cashbook" }) });

    expect(vi.mocked(getFinanceCashbookInitialData)).toHaveBeenCalledTimes(1);
    expect((element as any).props.initialCashbookData).toEqual({ summary: { summary: { codTotal: 0 } } });
    expect((element as any).props.initialAnalysisData).toBeNull();
  });
});
