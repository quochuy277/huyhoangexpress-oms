"use client";

import { useEffect, useRef, useState } from "react";
import { Package, Store, CheckCircle } from "lucide-react";

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
}

function useCountUp(end: number, duration = 2000, trigger = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger || end <= 0) return;

    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [end, duration, trigger]);

  return count;
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString("vi-VN");
  }
  return n.toString();
}

export type LandingStats = { totalOrders: number; activeShops: number; successRate: number };

const DEFAULT_STATS: LandingStats = { totalOrders: 0, activeShops: 0, successRate: 0 };

export function StatsSection({ initialStats }: { initialStats?: LandingStats }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<LandingStats>(initialStats ?? DEFAULT_STATS);

  // Only fetch client-side if no initialStats provided (fallback)
  const hasInitialStats = !!initialStats;
  useEffect(() => {
    if (hasInitialStats) return;
    fetch("/api/landing/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch((err) => {
        console.warn("[StatsSection] Failed to fetch landing stats:", err);
      });
  }, [hasInitialStats]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ordersCount = useCountUp(stats.totalOrders, 2000, visible);
  const shopsCount = useCountUp(stats.activeShops, 1500, visible);
  const rateCount = useCountUp(stats.successRate * 10, 1800, visible); // ×10 for decimal

  const items: StatItem[] = [
    {
      icon: <Package className="w-8 h-8" />,
      value: ordersCount,
      suffix: "+",
      label: "Đơn hàng đã xử lý",
    },
    {
      icon: <Store className="w-8 h-8" />,
      value: shopsCount,
      suffix: "+",
      label: "Shop đang hợp tác",
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      value: rateCount,
      suffix: "%",
      label: "Tỷ lệ giao thành công",
    },
  ];

  return (
    <section
      id="stats"
      ref={ref}
      className="py-16 sm:py-20 bg-[#1a3a4a]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
          {items.map((item, i) => (
            <div
              key={i}
              className="text-center group"
            >
              <div className="inline-flex p-3 rounded-2xl bg-white/10 text-white/90 mb-4 group-hover:bg-white/15 transition-colors">
                {item.icon}
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                {item.label === "Tỷ lệ giao thành công"
                  ? (item.value / 10).toFixed(1)
                  : formatNumber(item.value)}
                <span className="text-[#0ea5e9]">{item.suffix}</span>
              </div>
              <p className="mt-2 text-sm sm:text-base text-white/70 font-medium">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
