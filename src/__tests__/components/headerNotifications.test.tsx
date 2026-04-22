import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  selectHeaderAnnouncementForPreview,
  type HeaderAnnouncementPreviewItem,
} from "@/components/layout/headerAnnouncementPreview";
import { AnnouncementPreviewContent } from "@/components/shared/AnnouncementPreviewDialog";

const announcement: HeaderAnnouncementPreviewItem = {
  id: "announcement-1",
  title: "Nâng cấp ứng dụng",
  content:
    "<p>Ứng dụng vừa được cập nhật để tìm kiếm ổn định hơn. Phần cuối của thông báo chi tiết.</p>",
  attachmentUrl: "https://example.com/update-guide.pdf",
  attachmentName: "Tài liệu hướng dẫn.pdf",
  isPinned: true,
  createdByName: "Quản trị Admin",
  createdAt: "2026-04-02T08:30:00.000Z",
  isRead: false,
};

describe("header announcement preview helpers", () => {
  it("opens the preview state synchronously and marks read in the background", async () => {
    const callOrder: string[] = [];
    const markRead = vi.fn(async () => {
      callOrder.push("mark-read");
    });
    const refetchAnnouncements = vi.fn(async () => {
      callOrder.push("refetch");
    });

    // Sprint 2 contract: the next preview state must be available
    // synchronously — the dialog renders without waiting for the server. The
    // background task still runs mark-read then refetch in order, so the
    // next React render cycle sees authoritative data.
    const result = selectHeaderAnnouncementForPreview({
      announcement,
      markRead,
      refetchAnnouncements,
    });

    // Returns a plain object, not a Promise — no `.then` to await.
    expect(result).toEqual({
      bellOpen: false,
      previewAnnouncement: announcement,
    });

    // Background task completes asynchronously in the documented order.
    await vi.waitFor(() => {
      expect(markRead).toHaveBeenCalledWith("announcement-1");
      expect(refetchAnnouncements).toHaveBeenCalledTimes(1);
      expect(callOrder).toEqual(["mark-read", "refetch"]);
    });
  });

  it("renders the full announcement preview content including attachment details", () => {
    const html = renderToStaticMarkup(<AnnouncementPreviewContent announcement={announcement} />);

    expect(html).toContain("Phần cuối của thông báo chi tiết.");
    expect(html).toContain("Tài liệu hướng dẫn.pdf");
    expect(html).toContain("Quản trị Admin");
  });
});
