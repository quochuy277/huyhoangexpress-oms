import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";

describe("getCachedSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns the session from auth without reshaping it", async () => {
    const session = {
      user: {
        id: "user-1",
        name: "Nhân viên A",
      },
    };
    vi.mocked(auth).mockResolvedValue(session as never);

    const { getCachedSession } = await import("@/lib/cached-session");

    const first = await getCachedSession();

    expect(first).toEqual(session);
    expect(vi.mocked(auth)).toHaveBeenCalledTimes(1);
  });
});
