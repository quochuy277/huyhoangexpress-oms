import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("logger", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-14T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("writes info logs as structured JSON", async () => {
    const { logger } = await import("@/lib/logger");

    logger.info("GET /api/example", "Finished request", { rows: 3 });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      JSON.stringify({
        timestamp: "2026-04-14T09:00:00.000Z",
        level: "info",
        context: "GET /api/example",
        message: "Finished request",
        meta: { rows: 3 },
      }),
    );
  });

  it("serializes errors with name, message, and stack", async () => {
    const { logger } = await import("@/lib/logger");
    const error = new TypeError("boom");
    error.stack = "TypeError: boom\n    at test";

    logger.error("GET /api/example", "Request failed", error);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      JSON.stringify({
        timestamp: "2026-04-14T09:00:00.000Z",
        level: "error",
        context: "GET /api/example",
        message: "Request failed",
        error: {
          name: "TypeError",
          message: "boom",
          stack: "TypeError: boom\n    at test",
        },
      }),
    );
  });
});
