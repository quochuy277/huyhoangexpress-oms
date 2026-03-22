"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Truck, MapPin } from "lucide-react";

const HIGHLIGHTS = [
  {
    icon: Building2,
    value: "3+",
    label: "Năm hoạt động",
    color: "from-[#0ea5e9] to-[#0284c7]",
  },
  {
    icon: Truck,
    value: "5",
    label: "Đối tác vận chuyển",
    color: "from-[#f97316] to-[#ea580c]",
  },
  {
    icon: MapPin,
    value: "63",
    label: "Tỉnh thành phủ sóng",
    color: "from-emerald-500 to-emerald-600",
  },
];

export function AboutSection() {
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
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" className="py-20 sm:py-24 bg-white">
      <div
        ref={ref}
        className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Text */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3a4a]">
              Về Huy Hoàng Express
            </h2>
            <div className="mt-4 w-16 h-1 bg-[#0ea5e9] rounded-full" />
            <p className="mt-8 text-lg text-slate-600 leading-relaxed">
              Huy Hoàng Express là đơn vị trung gian vận chuyển, đóng vai trò cầu
              nối giữa cửa hàng online và các đối tác vận chuyển uy tín. Chúng
              tôi giúp các shop tiết kiệm thời gian, giảm chi phí vận chuyển và
              quản lý đơn hàng hiệu quả thông qua hệ thống công nghệ hiện đại.
            </p>
            <p className="mt-4 text-base text-slate-500 leading-relaxed">
              Với đội ngũ hỗ trợ tận tâm và hệ thống quản lý đơn hàng thông minh,
              chúng tôi cam kết mang đến trải nghiệm gửi hàng tối ưu nhất cho
              các shop trên toàn quốc.
            </p>
          </div>

          {/* Right — Highlight cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
            {HIGHLIGHTS.map((h, i) => (
              <div
                key={i}
                className={`group flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#0ea5e9]/30 hover:shadow-lg hover:shadow-[#0ea5e9]/5 transition-all duration-500 ${visible
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-8"
                  }`}
                style={{ transitionDelay: `${300 + i * 150}ms` }}
              >
                <div
                  className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${h.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <h.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-[#1a3a4a]">
                    {h.value}
                  </div>
                  <div className="text-sm text-slate-500 font-medium">
                    {h.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
