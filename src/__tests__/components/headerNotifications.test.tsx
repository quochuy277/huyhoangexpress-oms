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
  it("marks the selected announcement as read and prepares preview state", async () => {
    const callOrder: string[] = [];
    const markRead = vi.fn(async () => {
      callOrder.push("mark-read");
    });
    const refetchAnnouncements = vi.fn(async () => {
      callOrder.push("refetch");
    });

    const result = await selectHeaderAnnouncementForPreview({
      announcement,
      markRead,
      refetchAnnouncements,
    });

    expect(markRead).toHaveBeenCalledWith("announcement-1");
    expect(refetchAnnouncements).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["mark-read", "refetch"]);
    expect(result).toEqual({
      bellOpen: false,
      previewAnnouncement: announcement,
    });
  });

  it("renders the full announcement preview content including attachment details", () => {
    const html = renderToStaticMarkup(<AnnouncementPreviewContent announcement={announcement} />);

    expect(html).toContain("Phần cuối của thông báo chi tiết.");
    expect(html).toContain("Tài liệu hướng dẫn.pdf");
    expect(html).toContain("Quản trị Admin");
  });
});
