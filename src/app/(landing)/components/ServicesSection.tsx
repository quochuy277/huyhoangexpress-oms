"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Wallet, BarChart3, Shield } from "lucide-react";

const SERVICES = [
  {
    icon: Globe,
    title: "Giao hàng toàn quốc",
    desc: "Phủ sóng 63 tỉnh thành với 5 đối tác vận chuyển. Tự động chọn NVC tối ưu cho từng đơn.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Wallet,
    title: "Thu hộ COD",
    desc: "Nhận tiền thu hộ nhanh chóng, đối soát rõ ràng. Hỗ trợ ứng COD tự động.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: BarChart3,
    title: "Quản lý đơn hàng",
    desc: "Theo dõi trạng thái đơn realtime. Chủ động xử lý đơn hoãn, đơn hoàn, đơn có vấn đề.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Shield,
    title: "Hỗ trợ khiếu nại",
    desc: "Đội ngũ chuyên trách theo dõi và khiếu nại đền bù với nhà vận chuyển thay bạn.",
    color: "bg-rose-50 text-rose-600",
  },
];

export function ServicesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="services" className="py-20 sm:py-24 bg-[#f8fafc]">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3a4a]">
            Dịch vụ của chúng tôi
          </h2>
          <div className="mt-4 w-16 h-1 bg-[#0ea5e9] rounded-full mx-auto" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SERVICES.map((s, i) => (
            <div
              key={i}
              className={`group p-6 bg-white rounded-2xl border border-slate-100 hover:border-[#0ea5e9]/30 hover:shadow-lg hover:shadow-[#0ea5e9]/5 transition-all duration-500 ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div
                className={`inline-flex p-3 rounded-xl ${s.color} mb-5 group-hover:scale-110 transition-transform duration-300`}
              >
                <s.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#1a3a4a] mb-2">
                {s.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
