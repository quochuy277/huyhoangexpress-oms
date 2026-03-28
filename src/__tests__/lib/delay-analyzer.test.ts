import { describe, expect, it } from "vitest";
import { countDelaysInNote, extractReasons, getLastDelayDate, parseDelays } from "@/lib/delay-analyzer";

describe("delay-analyzer", () => {
  it("parses ascii delayed note lines", () => {
    const note = [
      "10:30 - 20/03/2026 Hoan giao hang vi: Khong lien lac duoc KH",
      "09:15 - 18/03/2026 Xac nhan hoan vi: Khach yeu cau hoan",
    ].join("\n");

    expect(parseDelays(note)).toEqual([
      { time: "10:30", date: "20/03/2026", reason: "Khong lien lac duoc KH" },
      { time: "09:15", date: "18/03/2026", reason: "Khach yeu cau hoan" },
    ]);
  });

  it("extracts normalized reasons from ascii notes", () => {
    expect(
      extractReasons("10:30 - 20/03/2026 Hoan giao hang vi: Khong lien lac duoc KH"),
    ).toEqual(["Khong lien lac duoc KH"]);
    expect(countDelaysInNote("10:30 - 20/03/2026 Hoan giao hang vi: KH hen lai ngay giao")).toBe(1);
  });

  it("returns the most recent delayed timestamp from ascii notes", () => {
    const note = [
      "10:30 - 20/03/2026 Hoan giao hang vi: Khong lien lac duoc KH",
      "08:00 - 18/03/2026 Dang giao",
    ].join("\n");

    expect(getLastDelayDate(note)?.toISOString()).toBe("2026-03-20T03:30:00.000Z");
  });
});
