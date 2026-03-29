import { describe, expect, it } from "vitest";
import { countDelaysInNote, extractReasons, getLastDelayDate, parseDelays } from "@/lib/delay-analyzer";

describe("delay-analyzer", () => {
  it("parses delayed note lines in chronological order and preserves accented Vietnamese reasons", () => {
    const note = [
      "10:30 - 20/03/2026 Hoãn giao hàng vì: Không liên lạc được KH",
      "09:15 - 18/03/2026 Xác nhận hoàn vì: Khách yêu cầu hoãn",
    ].join("\n");

    expect(parseDelays(note)).toEqual([
      { time: "09:15", date: "18/03/2026", reason: "Khách yêu cầu hoãn" },
      { time: "10:30", date: "20/03/2026", reason: "Không liên lạc được KH" },
    ]);
  });

  it("extracts normalized reasons with full Vietnamese accents", () => {
    expect(
      extractReasons("10:30 - 20/03/2026 Hoãn giao hàng vì: Không liên lạc được KH"),
    ).toEqual(["Không liên lạc được KH"]);
    expect(countDelaysInNote("10:30 - 20/03/2026 Hoãn giao hàng vì: KH hẹn lại ngày giao")).toBe(1);
  });

  it("returns the most recent delayed timestamp from accented notes", () => {
    const note = [
      "10:30 - 20/03/2026 Hoãn giao hàng vì: Không liên lạc được KH",
      "08:00 - 18/03/2026 Đang giao",
    ].join("\n");

    expect(getLastDelayDate(note)?.toISOString()).toBe("2026-03-20T03:30:00.000Z");
  });
});
