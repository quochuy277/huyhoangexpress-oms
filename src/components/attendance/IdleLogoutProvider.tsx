"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import { X, Clock, Moon } from "lucide-react";

const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 99998, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
};

export default function IdleLogoutProvider({ children }: { children: React.ReactNode }) {
  const [idleWarning, setIdleWarning] = useState<number | null>(null); // minutes left
  const [midnightWarning, setMidnightWarning] = useState(false);
  const lastActivityRef = useRef(Date.now());
  const settingsRef = useRef({ idleTimeout: 60, autoLogout: "00:00" });

  // Fetch settings periodically
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/attendance");
      const data = await res.json();
      settingsRef.current = {
        idleTimeout: parseInt(data.idle_timeout) || 60,
        autoLogout: data.auto_logout || "00:00",
      };
    } catch {}
  }, []);

  useEffect(() => {
    fetchSettings();
    const settingsInterval = setInterval(fetchSettings, 5 * 60 * 1000); // Refresh every 5 min
    return () => clearInterval(settingsInterval);
  }, [fetchSettings]);

  // Activity tracking
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      sessionStorage.setItem("lastActivityTime", String(lastActivityRef.current));
      // Dismiss idle warning on activity
      setIdleWarning(null);
    };

    let debounceTimer: NodeJS.Timeout;
    const handleActivity = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(updateActivity, 1000);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach(e => window.addEventListener(e, handleActivity));
    updateActivity();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearTimeout(debounceTimer);
    };
  }, []);

  // Idle check timer
  useEffect(() => {
    const checkIdle = setInterval(() => {
      const { idleTimeout } = settingsRef.current;
      const minutesSinceActivity = (Date.now() - lastActivityRef.current) / 60000;

      // 5 min before: show warning
      if (minutesSinceActivity >= idleTimeout - 5 && minutesSinceActivity < idleTimeout) {
        setIdleWarning(Math.ceil(idleTimeout - minutesSinceActivity));
      }

      // Timeout reached: force logout with backdated time
      if (minutesSinceActivity >= idleTimeout) {
        const effectiveLogoutTime = new Date(lastActivityRef.current);
        fetch("/api/auth/track-logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "idle_timeout", effectiveLogoutTime }),
        }).finally(() => {
          signOut({ callbackUrl: "/login" });
        });
      }
    }, 30000); // every 30 seconds

    return () => clearInterval(checkIdle);
  }, []);

  // Midnight check timer
  useEffect(() => {
    const checkMidnight = setInterval(() => {
      const { autoLogout } = settingsRef.current;
      const [targetH, targetM] = autoLogout.split(":").map(Number);

      const now = new Date();
      const vnNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
      const currentMinutes = vnNow.getHours() * 60 + vnNow.getMinutes();
      const targetMinutes = targetH * 60 + targetM;

      // 5 min before
      const diff = targetMinutes - currentMinutes;
      if (diff > 0 && diff <= 5) {
        setMidnightWarning(true);
      }

      // At exact time (within 1 min window)
      if (diff <= 0 && diff > -1) {
        fetch("/api/auth/track-logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "auto_midnight" }),
        }).finally(() => {
          signOut({ callbackUrl: "/login" });
        });
      }
    }, 60000); // every 60 seconds

    return () => clearInterval(checkMidnight);
  }, []);

  const dismissIdle = () => {
    lastActivityRef.current = Date.now();
    sessionStorage.setItem("lastActivityTime", String(lastActivityRef.current));
    setIdleWarning(null);
  };

  return (
    <>
      {children}

      {/* Idle warning popup */}
      {idleWarning !== null && (
        <>
          <div style={overlayStyle} onClick={dismissIdle} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 99999, background: "#fff", borderRadius: "14px", border: "2px solid #f59e0b",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)", width: "420px", maxWidth: "90vw", padding: "28px",
            animation: "popIn 0.2s ease-out",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: 700, color: "#d97706" }}>
                <Clock size={20} /> Cảnh báo không hoạt động
              </div>
              <button onClick={dismissIdle} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: "#4b5563", fontSize: "14px", lineHeight: 1.6, margin: "0 0 8px" }}>
              Bạn không thao tác trong thời gian dài.
            </p>
            <p style={{ color: "#4b5563", fontSize: "14px", lineHeight: 1.6, margin: "0 0 20px" }}>
              Hệ thống sẽ tự động đăng xuất sau <strong style={{ color: "#d97706" }}>{idleWarning} phút</strong>.
            </p>
            <p style={{ color: "#9ca3af", fontSize: "12px", margin: "0 0 20px" }}>
              Di chuột hoặc bấm phím bất kỳ để tiếp tục.
            </p>
            <div style={{ textAlign: "right" }}>
              <button
                onClick={dismissIdle}
                style={{
                  padding: "10px 24px", borderRadius: "8px", border: "none",
                  background: "#f59e0b", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                }}
              >
                Tiếp tục làm việc
              </button>
            </div>
          </div>
        </>
      )}

      {/* Midnight warning popup */}
      {midnightWarning && (
        <>
          <div style={overlayStyle} onClick={() => setMidnightWarning(false)} />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            zIndex: 99999, background: "#fff", borderRadius: "14px", border: "2px solid #2563EB",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)", width: "420px", maxWidth: "90vw", padding: "28px",
            animation: "popIn 0.2s ease-out",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: 700, color: "#2563EB" }}>
                <Moon size={20} /> Sắp đến giờ đăng xuất tự động
              </div>
              <button onClick={() => setMidnightWarning(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ color: "#4b5563", fontSize: "14px", lineHeight: 1.6, margin: "0 0 8px" }}>
              Hệ thống sẽ tự động đăng xuất lúc <strong>{settingsRef.current.autoLogout}</strong>.
            </p>
            <p style={{ color: "#9ca3af", fontSize: "13px", margin: "0 0 20px" }}>
              Vui lòng lưu lại công việc.
            </p>
            <div style={{ textAlign: "right" }}>
              <button
                onClick={() => setMidnightWarning(false)}
                style={{
                  padding: "10px 24px", borderRadius: "8px", border: "none",
                  background: "#2563EB", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer",
                }}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes popIn { from { opacity:0; transform:translate(-50%,-50%) scale(0.9) } to { opacity:1; transform:translate(-50%,-50%) scale(1) } }`}</style>
    </>
  );
}
