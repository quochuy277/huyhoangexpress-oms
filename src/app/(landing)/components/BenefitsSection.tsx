"use client";

import { useEffect, useRef, useState } from "react";
import {
  Truck,
  Coins,
  Headphones,
  ShieldCheck,
  FileCheck,
  MapPin,
} from "lucide-react";

const BENEFITS = [
  {
    icon: Truck,
    title: "Đa lựa chọn NVC",
    desc: "Lựa chọn gửi hàng qua nhiều ĐVVC: GHN, GHTK, SPX, J&T, Best...",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    icon: Coins,
    title: "Tiết kiệm chi phí",
    desc: "Tối ưu chi phí vận chuyển với ưu đãi gửi hàng chỉ từ 15.000đ/đơn.",
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    icon: Headphones,
    title: "Hỗ trợ 24/7",
    desc: "Đội ngũ nhân viên CSKH hỗ trợ 24/7. Hỗ trợ đóng đơn mọi lúc mọi nơi.",
    gradient: "from-sky-500 to-sky-600",
  },
  {
    icon: ShieldCheck,
    title: "Cam kết đơn hàng",
    desc: "Cam kết tốc độ giao, tỉ lệ hoàn thấp nhất. Cam kết đền bù thất lạc hư hỏng.",
    gradient: "from-amber-500 to-amber-600",
  },
  {
    icon: FileCheck,
    title: "Đối soát — Ứng COD",
    desc: "Hỗ trợ ứng COD tự động. Đối soát hàng ngày minh bạch rõ ràng.",
    gradient: "from-rose-500 to-rose-600",
  },
  {
    icon: MapPin,
    title: "Hệ thống rộng khắp",
    desc: "Hơn 4.000 bưu cục phát hàng toàn quốc, phủ sóng 63 tỉnh thành.",
    gradient: "from-teal-500 to-teal-600",
  },
];

export function BenefitsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

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
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-20 sm:py-24 bg-[#f8fafc]">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3a4a]">
            Tại sao chọn Huy Hoàng Express?
          </h2>
          <div className="mt-4 w-16 h-1 bg-[#0ea5e9] rounded-full mx-auto" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BENEFITS.map((b, i) => (
            <div
              key={i}
              className={`group relative flex gap-4 p-6 bg-white rounded-2xl border border-slate-100 hover:border-transparent hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 hover:-translate-y-1 ${visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
                }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {/* Gradient border on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#0ea5e9]/20 to-[#f97316]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm" />

              <div
                className={`shrink-0 inline-flex p-3 h-fit rounded-xl bg-gradient-to-br ${b.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}
              >
                <b.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[#1a3a4a] mb-1">{b.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {b.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
