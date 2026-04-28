"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const HEARTBEAT_INTERVAL = 10 * 60 * 1000; // Reduce steady loginHistory writes on Supabase Nano.
const INITIAL_HEARTBEAT_DELAY = 15 * 1000;

export default function HeartbeatProvider() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/attendance/heartbeat", { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          if (data.forceLogout) {
            // Admin force-logged us out — redirect to login
            signOut({ callbackUrl: "/login" });
          }
        } else if (res.status === 401) {
          // JWT invalidated (user deactivated/deleted) — force sign out
          signOut({ callbackUrl: "/login" });
        }
      } catch {
        // Silently ignore network errors
      }
    };

    // Delay the initial heartbeat so the first route render is not blocked by background work.
    initialTimeoutRef.current = setTimeout(sendHeartbeat, INITIAL_HEARTBEAT_DELAY);

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
      if (initialTimeoutRef.current) clearTimeout(initialTimeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return null; // This component renders nothing
}
