import { describe, expect, it } from "vitest";

import {
  getClaimCompleteDialogCopy,
  getClaimReopenDialogCopy,
  getConfirmDialogToneConfig,
  getDuplicateClaimDialogCopy,
  getUnsavedClaimDialogCopy,
} from "@/lib/confirm-dialog";

describe("confirm-dialog helpers", () => {
  it("returns an info tone config that matches the app's blue accent style", () => {
    expect(getConfirmDialogToneConfig("info")).toMatchObject({
      accent: "#2563EB",
      confirmBg: "#2563EB",
      confirmHover: "#1d4ed8",
    });
  });

  it("builds duplicate-claim copy with request code and edit-focused CTA", () => {
    expect(getDuplicateClaimDialogCopy("B65AODT0011780")).toEqual({
      title: "Đơn đã có trong Đơn có vấn đề",
      description:
        "Đơn B65AODT0011780 đã có trong Đơn có vấn đề. Bạn có muốn mở chi tiết đơn hiện có để sửa lại không?",
      confirmLabel: "Mở chi tiết để sửa",
      cancelLabel: "Để sau",
      tone: "info",
    });
  });

  it("builds unsaved-change copy with a warning tone and discard CTA", () => {
    expect(getUnsavedClaimDialogCopy()).toEqual({
      title: "Bạn có thay đổi chưa lưu",
      description: "Nếu thoát bây giờ, các thay đổi chưa lưu sẽ bị mất.",
      confirmLabel: "Thoát không lưu",
      cancelLabel: "Tiếp tục chỉnh sửa",
      tone: "warning",
    });
  });

  it("returns success-tone copy for completing a claim", () => {
    expect(getClaimCompleteDialogCopy("YC123")).toEqual({
      title: "Hoàn tất xử lý",
      description:
        "Xác nhận đơn YC123 đã hoàn tất xử lý? Trạng thái sẽ được đánh dấu là đã xong.",
      confirmLabel: "Hoàn tất",
      cancelLabel: "Để sau",
      tone: "success",
    });
  });

  it("returns warning-tone copy for reopening a completed claim", () => {
    expect(getClaimReopenDialogCopy("YC123")).toEqual({
      title: "Kéo lại chưa hoàn tất",
      description:
        "Đơn YC123 sẽ được chuyển lại về trạng thái chưa hoàn tất. Trạng thái xử lý hiện tại sẽ được giữ nguyên.",
      confirmLabel: "Kéo lại",
      cancelLabel: "Giữ nguyên",
      tone: "warning",
    });
  });
});