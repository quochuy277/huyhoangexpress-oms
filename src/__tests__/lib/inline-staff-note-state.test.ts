import { describe, expect, it } from "vitest";
import { buildInlineStaffNoteSaveState } from "@/lib/inline-staff-note-state";

describe("inline-staff-note-state", () => {
  it("returns trimmed persisted value on successful save", () => {
    expect(
      buildInlineStaffNoteSaveState({
        previousValue: "Cu",
        draftValue: "  Moi  ",
        ok: true,
      }),
    ).toEqual({
      value: "Moi",
      previousValue: "Moi",
      saved: true,
      error: null,
      editing: false,
    });
  });

  it("rolls back to previous value on failed save", () => {
    expect(
      buildInlineStaffNoteSaveState({
        previousValue: "Cu",
        draftValue: "Moi",
        ok: false,
        errorMessage: "Khong the luu ghi chu",
      }),
    ).toEqual({
      value: "Cu",
      previousValue: "Cu",
      saved: false,
      error: "Khong the luu ghi chu",
      editing: true,
    });
  });
});
