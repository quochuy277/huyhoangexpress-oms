/**
 * Server-Timing helper for measuring API route performance.
 *
 * Usage:
 *   const timing = createServerTiming();
 *   const data = await timing.measure("db", () => prisma.order.findMany(...));
 *   const result = timing.measure("transform", () => processData(data));
 *   return NextResponse.json(result, { headers: timing.headers() });
 *
 * The resulting header looks like:
 *   Server-Timing: db;dur=123.4, transform;dur=5.6, total;dur=130.2
 */

import { logger } from "@/lib/logger";

interface TimingEntry {
  name: string;
  duration: number; // milliseconds
  description?: string;
}

export function mergeServerTimingValues(
  baseValue: string,
  extraValue: string | null | undefined,
  options?: { includeExtraTotal?: boolean },
): string {
  if (!extraValue) return baseValue;

  const includeExtraTotal = options?.includeExtraTotal ?? false;
  const extraEntries = extraValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => includeExtraTotal || !entry.startsWith("total;"));

  if (extraEntries.length === 0) return baseValue;
  return [baseValue, ...extraEntries].join(", ");
}

export function createServerTiming() {
  const entries: TimingEntry[] = [];
  const startTime = performance.now();

  return {
    /**
     * Measure an async or sync operation.
     * Returns the operation's result so it can be chained inline.
     */
    async measure<T>(name: string, fn: () => T | Promise<T>, description?: string): Promise<T> {
      const t0 = performance.now();
      try {
        const result = await fn();
        entries.push({ name, duration: performance.now() - t0, description });
        return result;
      } catch (err) {
        entries.push({ name, duration: performance.now() - t0, description: `${description ?? name}(error)` });
        throw err;
      }
    },

    /**
     * Manually record a timing entry (e.g. for sub-steps already measured).
     */
    record(name: string, durationMs: number, description?: string) {
      entries.push({ name, duration: durationMs, description });
    },

    /**
     * Build the Server-Timing header value.
     * Automatically appends a "total" entry from creation to now.
     */
    headerValue(): string {
      const total = performance.now() - startTime;
      const allEntries = [...entries, { name: "total", duration: total }];
      return allEntries
        .map((e) => {
          const desc = e.description ? `;desc="${e.description}"` : "";
          return `${e.name};dur=${e.duration.toFixed(1)}${desc}`;
        })
        .join(", ");
    },

    /**
     * Return a Headers-compatible object for NextResponse.
     */
    headers(): Record<string, string> {
      return { "Server-Timing": this.headerValue() };
    },

    /**
     * Log timing summary to console (for dev/debugging).
     */
    log(routeName: string) {
      if (process.env.NODE_ENV === "production") return;
      const total = performance.now() - startTime;
      logger.info(`Server-Timing ${routeName}`, "Timing summary", {
        entries: entries.map((entry) => ({
          name: entry.name,
          duration: Number(entry.duration.toFixed(1)),
          description: entry.description,
        })),
        total: Number(total.toFixed(1)),
      });
    },
  };
}
