import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/cached-session", () => ({
  getCachedSession: vi.fn(),
}));

vi.mock("@/lib/crm-page-data", () => ({
  getCrmProspectsInitialData: vi.fn(),
  getCrmShopsInitialData: vi.fn(),
}));

vi.mock("@/components/crm/CrmClient", () => ({
  CrmClient: () => null,
}));

import { getCachedSession } from "@/lib/cached-session";
import { getCrmProspectsInitialData, getCrmShopsInitialData } from "@/lib/crm-page-data";

describe("CrmPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedSession).mockResolvedValue({
      user: {
        id: "user-1",
        name: "Nhân viên A",
        role: "ADMIN",
        permissions: { canViewCRM: true, canViewAllShops: true },
      },
    } as never);
  });

  it("prefetches prospects data when opening the prospects tab directly", async () => {
    vi.mocked(getCrmProspectsInitialData).mockResolvedValue({ prospects: { success: true } } as never);

    const { default: CrmPage } = await import("@/app/(dashboard)/crm/page");
    const element = await CrmPage({ searchParams: Promise.resolve({ tab: "prospects" }) } as never);

    expect(vi.mocked(getCrmProspectsInitialData)).toHaveBeenCalledTimes(1);
    expect((element as any).props.initialProspectsData).toEqual({ prospects: { success: true } });
    expect((element as any).props.initialShopsData).toBeNull();
  });

  it("prefetches shops data for the default shops tab", async () => {
    vi.mocked(getCrmShopsInitialData).mockResolvedValue({ dashboard: { success: true } } as never);

    const { default: CrmPage } = await import("@/app/(dashboard)/crm/page");
    const element = await CrmPage({ searchParams: Promise.resolve({}) } as never);

    expect(vi.mocked(getCrmShopsInitialData)).toHaveBeenCalledTimes(1);
    expect((element as any).props.initialShopsData).toEqual({ dashboard: { success: true } });
    expect((element as any).props.initialProspectsData).toBeNull();
  });
});
