"use client";

import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // 2 minutes

export default function HeartbeatProvider() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/attendance/heartbeat", { method: "POST" });
      } catch {
        // Silently ignore network errors
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up periodic heartbeat
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Send logout beacon when browser/tab closes
    const handleBeforeUnload = () => {
      navigator.sendBeacon(
        "/api/auth/signout-beacon",
        JSON.stringify({ reason: "browser_closed" })
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return null; // This component renders nothing
}
