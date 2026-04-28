"use client";

import { CheckCircle2, PackageCheck, RefreshCcw, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type LandingStats = { totalOrders: number; activeShops: number; successRate: number };

const DEFAULT_STATS: LandingStats = {
  totalOrders: 200_000,
  activeShops: 250,
  successRate: 98.6,
};

function useCountUp(end: number, duration = 1200, trigger = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger || end <= 0) return;

    let frame = 0;
    const totalFrames = Math.max(1, Math.round(duration / 16));
    const timer = window.setInterval(() => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
      setCount(Math.round(end * Math.min(progress, 1)));
      if (frame >= totalFrames) window.clearInterval(timer);
    }, 16);

    return () => window.clearInterval(timer);
  }, [end, duration, trigger]);

  return trigger ? count : end;
}

function formatNumber(n: number) {
  return n.toLocaleString("vi-VN");
}

export function StatsSection({ initialStats }: { initialStats?: LandingStats }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const stats = {
    totalOrders: Math.max(initialStats?.totalOrders ?? 0, DEFAULT_STATS.totalOrders),
    activeShops: Math.max(initialStats?.activeShops ?? 0, DEFAULT_STATS.activeShops),
    successRate:
      initialStats?.successRate && initialStats.successRate > 0
        ? initialStats.successRate
        : DEFAULT_STATS.successRate,
  };

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
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const orders = useCountUp(stats.totalOrders, 1300, visible);
  const shops = useCountUp(stats.activeShops, 1100, visible);
  const rate = useCountUp(Math.round(stats.successRate * 10), 1200, visible);

  const items = [
    {
      icon: PackageCheck,
      value: `${formatNumber(orders)}+`,
      label: "Đơn xử lý",
    },
    {
      icon: Store,
      value: `${formatNumber(shops)}+`,
      label: "Shop hợp tác",
    },
    {
      icon: CheckCircle2,
      value: `${(rate / 10).toFixed(1)}%`,
      label: "Giao thành công",
    },
  ];

  return (
    <section id="stats" ref={ref} className="bg-[#123241] py-12 text-white sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid gap-4 sm:grid-cols-3">
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-4 rounded-xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                <div className="rounded-lg bg-white/10 p-3 text-sky-200">
                  <item.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-3xl font-extrabold tracking-normal sm:text-4xl">
                    {item.value}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-white/68">{item.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/70">
            <RefreshCcw className="h-5 w-5 text-emerald-300" />
            Dữ liệu vận hành được cập nhật liên tục
          </div>
        </div>
      </div>
    </section>
  );
}
