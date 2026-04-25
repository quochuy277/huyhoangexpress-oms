import type { AnnouncementPreviewItem } from "@/components/shared/AnnouncementPreviewDialog";

export type HeaderAnnouncementPreviewItem = AnnouncementPreviewItem;

interface SelectHeaderAnnouncementForPreviewOptions {
  announcement: HeaderAnnouncementPreviewItem;
  markRead: (id: string) => Promise<void>;
  refetchAnnouncements: () => Promise<unknown> | unknown;
}

/**
 * Optimistically open the announcement preview.
 *
 * Sprint 2 (2026-04) change: previously this awaited `markRead` and
 * `refetchAnnouncements` before returning the next preview state. On slow
 * connections that meant the preview dialog didn't render until the full
 * server round-trip + list refetch completed (200-1500ms), even though we
 * already had the full announcement payload client-side.
 *
 * Now we return the next state immediately and run mark-read + refetch as
 * a background task (in that order — the refetch waits for mark-read so the
 * authoritative response already reflects the new read state). Failures are
 * silently dropped; the next natural list refresh will reconcile. Callers
 * who also want the in-memory list to reflect the read state without waiting
 * for the refetch should do an optimistic `queryClient.setQueryData` patch
 * before invoking this function — see Header.tsx.
 */
export function selectHeaderAnnouncementForPreview({
  announcement,
  markRead,
  refetchAnnouncements,
}: SelectHeaderAnnouncementForPreviewOptions) {
  void runBackgroundReadSync(announcement.id, markRead, refetchAnnouncements);

  return {
    bellOpen: false as const,
    previewAnnouncement: announcement,
  };
}

async function runBackgroundReadSync(
  id: string,
  markRead: (id: string) => Promise<void>,
  refetchAnnouncements: () => Promise<unknown> | unknown,
) {
  try {
    await markRead(id);
  } catch {
    // Swallow — the next refresh cycle will pick up the authoritative state.
  }
  try {
    await refetchAnnouncements();
  } catch {
    // Same reason as above.
  }
}
