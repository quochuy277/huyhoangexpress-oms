import type { AnnouncementPreviewItem } from "@/components/shared/AnnouncementPreviewDialog";

export type HeaderAnnouncementPreviewItem = AnnouncementPreviewItem;

interface SelectHeaderAnnouncementForPreviewOptions {
  announcement: HeaderAnnouncementPreviewItem;
  markRead: (id: string) => Promise<void>;
  refetchAnnouncements: () => Promise<unknown> | unknown;
}

export async function selectHeaderAnnouncementForPreview({
  announcement,
  markRead,
  refetchAnnouncements,
}: SelectHeaderAnnouncementForPreviewOptions) {
  await markRead(announcement.id);
  await refetchAnnouncements();

  return {
    bellOpen: false as const,
    previewAnnouncement: announcement,
  };
}
