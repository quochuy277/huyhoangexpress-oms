import { afterEach, describe, expect, it } from "vitest";
import { classifyDue, getDayWindows, getMonthEnd, getTzOffsetMinutes } from "@/lib/todo-dates";

afterEach(() => {
  delete process.env.APP_TZ_OFFSET;
});

describe("getTzOffsetMinutes", () => {
  it("mặc định +07:00 (420 phút)", () => {
    expect(getTzOffsetMinutes()).toBe(420);
  });
  it("đọc override từ APP_TZ_OFFSET", () => {
    process.env.APP_TZ_OFFSET = "0";
    expect(getTzOffsetMinutes()).toBe(0);
  });
  it("override không hợp lệ → mặc định", () => {
    process.env.APP_TZ_OFFSET = "abc";
    expect(getTzOffsetMinutes()).toBe(420);
  });
});

describe("getDayWindows (+07:00)", () => {
  it("đầu/cuối ngày theo giờ VN", () => {
    const { todayStart, todayEnd } = getDayWindows(new Date("2026-06-15T03:00:00Z"));
    expect(todayStart.toISOString()).toBe("2026-06-14T17:00:00.000Z");
    expect(todayEnd.toISOString()).toBe("2026-06-15T17:00:00.000Z");
  });

  it("23:30 VN vẫn thuộc ngày hiện tại", () => {
    const { todayStart } = getDayWindows(new Date("2026-06-15T16:30:00Z"));
    expect(todayStart.toISOString()).toBe("2026-06-14T17:00:00.000Z");
  });

  it("00:30 VN đã sang ngày mới", () => {
    const { todayStart } = getDayWindows(new Date("2026-06-15T17:30:00Z"));
    expect(todayStart.toISOString()).toBe("2026-06-15T17:00:00.000Z");
  });

  it("Chủ Nhật thuộc tuần đang diễn ra (tuần bắt đầu Thứ Hai)", () => {
    const { weekStart, weekEnd } = getDayWindows(new Date("2026-06-14T03:00:00Z"));
    expect(weekStart.toISOString()).toBe("2026-06-07T17:00:00.000Z");
    expect(weekEnd.toISOString()).toBe("2026-06-14T17:00:00.000Z");
  });
});

describe("getMonthEnd (+07:00)", () => {
  it("trả về 00:00 VN ngày đầu tháng kế", () => {
    const end = getMonthEnd(new Date("2026-06-15T03:00:00Z"));
    expect(end.toISOString()).toBe("2026-06-30T17:00:00.000Z");
  });
});

describe("classifyDue", () => {
  const now = new Date("2026-06-15T03:00:00Z");

  it("DONE → none", () => {
    expect(classifyDue("2026-06-10T00:00:00Z", "DONE", now)).toBe("none");
  });
  it("null → none", () => {
    expect(classifyDue(null, "TODO", now)).toBe("none");
  });
  it("hạn trước hôm nay → overdue", () => {
    expect(classifyDue("2026-06-13T03:00:00Z", "TODO", now)).toBe("overdue");
  });
  it("hạn hôm nay (đã qua giờ) vẫn là today", () => {
    expect(classifyDue("2026-06-15T09:00:00Z", "IN_PROGRESS", now)).toBe("today");
  });
  it("hạn tương lai → upcoming", () => {
    expect(classifyDue("2026-06-20T03:00:00Z", "TODO", now)).toBe("upcoming");
  });
});
