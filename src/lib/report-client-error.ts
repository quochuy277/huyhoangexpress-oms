// Small helper used by every `error.tsx` boundary (segment + global) to ship
// uncaught errors to /api/client-errors. Keeps the three segment boundaries in
// sync without duplicating the sendBeacon/fetch dance.
//
// Safe to call anywhere: any failure is swallowed so logging can never take
// down the error screen itself.

type ClientErrorPayload = {
  name: string;
  message: string;
  stack?: string;
  digest?: string;
  scope: string;
  url?: string;
};

export function reportClientError(
  scope: string,
  error: Error & { digest?: string },
): void {
  try {
    const payload: ClientErrorPayload = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      scope,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };
    const body = JSON.stringify(payload);

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/client-errors", blob);
      return;
    }

    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let logging itself break the error screen.
  }
}
