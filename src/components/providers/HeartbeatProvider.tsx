"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes (reduced for Supabase free tier)

export default function HeartbeatProvider() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
        }
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

