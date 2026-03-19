"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertCircle, Package } from "lucide-react";

interface TrackingEvent {
  time: string;
  status: string;
  description: string;
  location?: string;
}

function parseTrackingResponse(data: any): TrackingEvent[] {
  if (!data) return [];

  // If the response IS already an array (SVExpress returns flat array)
  if (Array.isArray(data)) {
    return parseArrayItems(data);
  }

  // Try common response structures — prioritize "value" (SVExpress format)
  const items =
    data.value ||
    data.tracking ||
    data.trackingList ||
    data.data?.value ||
    data.data?.tracking ||
    data.data?.trackingList ||
    data.data?.items ||
    data.data?.logs ||
    data.data?.history ||
    data.data ||
    data.items ||
    data.logs ||
    data.history ||
    data.result?.tracking ||
    data.result?.data ||
    data.result;

  if (!Array.isArray(items)) {
    // If the whole response is an object with nested tracking
    if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
      // Search for any array property
      for (const key of Object.keys(data.data)) {
        if (Array.isArray(data.data[key]) && data.data[key].length > 0) {
          return parseArrayItems(data.data[key]);
        }
      }
    }
    // Search top-level
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        return parseArrayItems(data[key]);
      }
    }
    return [];
  }

  return parseArrayItems(items);
}

function parseArrayItems(items: any[]): TrackingEvent[] {
  return items
    .map((item: any) => {
      const time =
        item.time ||
        item.timestamp ||
        item.createdAt ||
        item.created_at ||
        item.date ||
        item.actionAt ||
        item.action_at ||
        item.updatedAt ||
        item.eventTime ||
        item.event_time ||
        "";

      const status =
        item.status ||
        item.statusName ||
        item.status_name ||
        item.title ||
        item.action ||
        item.actionName ||
        item.action_name ||
        item.eventName ||
        item.event ||
        "";

      const description =
        item.note ||
        item.description ||
        item.detail ||
        item.details ||
        item.message ||
        item.content ||
        item.remark ||
        item.statusDescription ||
        item.status_description ||
        "";

      const location =
        item.address ||
        item.location ||
        item.locationName ||
        item.location_name ||
        item.warehouse ||
        item.hub ||
        item.station ||
        item.stationName ||
        "";

      return { time, status, description, location };
    })
    .filter((e: TrackingEvent) => e.time || e.status || e.description);
}

function formatTrackingTime(timeStr: string): { date: string; time: string } {
  if (!timeStr) return { date: "", time: "" };

  try {
    // Handle "DD-MM-YYYY HH:mm" format (SVExpress format)
    const ddmmMatch = timeStr.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2})$/);
    if (ddmmMatch) {
      return {
        date: `${ddmmMatch[1]}/${ddmmMatch[2]}/${ddmmMatch[3]}`,
        time: ddmmMatch[4],
      };
    }

    // Handle "DD/MM/YYYY HH:mm" format
    const slashMatch = timeStr.match(/^(\d{2}\/(\d{2})\/\d{4})\s+(\d{2}:\d{2})$/);
    if (slashMatch) {
      return { date: slashMatch[1], time: slashMatch[3] };
    }

    // Try ISO date parsing
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return {
        date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      };
    }

    // Fallback: split on space
    if (timeStr.includes(" ")) {
      const parts = timeStr.split(" ");
      return { date: parts[0], time: parts.slice(1).join(" ") };
    }

    return { date: timeStr, time: "" };
  } catch {
    return { date: timeStr, time: "" };
  }
}

interface TrackingTimelineProps {
  requestCode: string;
  showHeader?: boolean;
  onRefresh?: () => void;
}

export function TrackingTimeline({ requestCode, showHeader = true, onRefresh }: TrackingTimelineProps) {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = useCallback(async () => {
    if (!requestCode) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${requestCode}/tracking`);
      if (!res.ok) {
        setError("Không thể tải hành trình đơn hàng.");
        return;
      }
      const data = await res.json();
      const parsed = parseTrackingResponse(data);
      // Sort reverse chronological (latest first)
      // Handle DD-MM-YYYY HH:mm format for sorting
      parsed.sort((a, b) => {
        const parseTime = (t: string) => {
          const m = t.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})/);
          if (m) return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime();
          return new Date(t).getTime() || 0;
        };
        return parseTime(b.time) - parseTime(a.time);
      });
      setEvents(parsed);
    } catch {
      setError("Không thể tải hành trình. Thử lại.");
    } finally {
      setLoading(false);
    }
  }, [requestCode]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  const handleRefresh = () => {
    fetchTracking();
    onRefresh?.();
  };

  // Loading skeleton
  if (loading) {
    return (
      <div>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600">Hành Trình Đơn Hàng</span>
            </div>
          </div>
        )}
        <div className="space-y-4 pl-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-200 mt-1.5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-3.5 bg-slate-200 rounded w-48" />
                <div className="h-3 bg-slate-100 rounded w-36" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div>
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">Hành Trình Đơn Hàng</span>
          </div>
        )}
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-300" />
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div>
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-600">Hành Trình Đơn Hàng</span>
          </div>
        )}
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Package className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-400">Chưa có dữ liệu hành trình.</p>
        </div>
      </div>
    );
  }

  // Determine dot color for latest event
  const getLatestDotColor = () => {
    const latest = events[0];
    const text = `${latest.status} ${latest.description}`.toLowerCase();
    if (text.includes("thành công") || text.includes("hoàn tất") || text.includes("delivered") || text.includes("đã giao"))
      return "bg-emerald-500 border-emerald-500";
    if (text.includes("thất bại") || text.includes("failed") || text.includes("hủy") || text.includes("cancel"))
      return "bg-red-500 border-red-500";
    if (text.includes("hoãn") || text.includes("delay") || text.includes("chậm"))
      return "bg-amber-500 border-amber-500";
    return "bg-blue-500 border-blue-500";
  };

  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-slate-700">Hành Trình Đơn Hàng</span>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Làm mới
          </button>
        </div>
      )}

      <div className="relative pl-5">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-2 bottom-2 w-[1.5px] bg-slate-200" />

        <div className="space-y-4">
          {events.map((event, idx) => {
            const { date, time } = formatTrackingTime(event.time);
            const isFirst = idx === 0;
            const isLast = idx === events.length - 1;

            let dotClass: string;
            if (isFirst) {
              dotClass = getLatestDotColor();
            } else if (isLast) {
              dotClass = "bg-white border-slate-400 border-[1.5px]";
            } else {
              dotClass = "bg-slate-400 border-slate-400";
            }

            return (
              <div key={idx} className="relative flex gap-3">
                {/* Dot */}
                <div
                  className={`absolute -left-5 top-[5px] w-[11px] h-[11px] rounded-full border-2 z-10 ${dotClass}`}
                  style={isFirst ? { boxShadow: "0 0 0 3px rgba(59,130,246,0.15)" } : undefined}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[11px] font-bold tabular-nums ${isFirst ? "text-slate-800" : "text-slate-500"}`}>
                      {date} {time}
                    </span>
                    {event.status && (
                      <span className={`text-[13px] font-semibold ${isFirst ? "text-slate-800" : "text-slate-600"}`}>
                        — {event.status}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className={`text-[12px] mt-0.5 leading-relaxed ${isFirst ? "text-slate-600" : "text-slate-500"}`}>
                      {event.description}
                    </p>
                  )}
                  {event.location && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{event.location}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
