import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearClaimsFilterOptionsCache,
  getCachedClaimsFilterOptionsData,
} from "@/lib/claims-filter-options-cache";

describe("claims filter options cache", () => {
  beforeEach(() => {
    clearClaimsFilterOptionsCache();
  });

  it("reuses cached filter options while the ttl is still valid", async () => {
    const load = vi.fn()
      .mockResolvedValueOnce({ shops: ["Shop A"], statuses: ["PENDING"] })
      .mockResolvedValueOnce({ shops: ["Shop B"], statuses: ["DONE"] });

    const first = await getCachedClaimsFilterOptionsData({
      load,
      now: 1_000,
      ttlMs: 60_000,
    });
    const second = await getCachedClaimsFilterOptionsData({
      load,
      now: 20_000,
      ttlMs: 60_000,
    });

    expect(first).toEqual({ shops: ["Shop A"], statuses: ["PENDING"] });
    expect(second).toEqual({ shops: ["Shop A"], statuses: ["PENDING"] });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("refreshes the cache when the ttl expires", async () => {
    const load = vi.fn()
      .mockResolvedValueOnce({ shops: ["Shop A"], statuses: ["PENDING"] })
      .mockResolvedValueOnce({ shops: ["Shop B"], statuses: ["DONE"] });

    await getCachedClaimsFilterOptionsData({
      load,
      now: 1_000,
      ttlMs: 60_000,
    });
    const refreshed = await getCachedClaimsFilterOptionsData({
      load,
      now: 61_500,
      ttlMs: 60_000,
    });

    expect(refreshed).toEqual({ shops: ["Shop B"], statuses: ["DONE"] });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("drops the cache after an explicit clear", async () => {
    const load = vi.fn()
      .mockResolvedValueOnce({ shops: ["Shop A"], statuses: ["PENDING"] })
      .mockResolvedValueOnce({ shops: ["Shop B"], statuses: ["DONE"] });

    await getCachedClaimsFilterOptionsData({
      load,
      now: 1_000,
      ttlMs: 60_000,
    });

    clearClaimsFilterOptionsCache();

    const reloaded = await getCachedClaimsFilterOptionsData({
      load,
      now: 2_000,
      ttlMs: 60_000,
    });

    expect(reloaded).toEqual({ shops: ["Shop B"], statuses: ["DONE"] });
    expect(load).toHaveBeenCalledTimes(2);
  });
});
