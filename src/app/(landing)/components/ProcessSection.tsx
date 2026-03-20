"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardEdit, TestTube, Repeat, FileSpreadsheet } from "lucide-react";

const STEPS = [
  {
    icon: ClipboardEdit,
    step: "01",
    title: "Đăng ký",
    desc: "Điền form đăng ký, chúng tôi liên hệ trong 24h.",
  },
  {
    icon: TestTube,
    step: "02",
    title: "Gửi đơn test",
    desc: "Gửi thử vài đơn để trải nghiệm dịch vụ miễn phí.",
  },
  {
    icon: Repeat,
    step: "03",
    title: "Vận hành",
    desc: "Gửi hàng hàng ngày qua hệ thống của chúng tôi.",
  },
  {
    icon: FileSpreadsheet,
    step: "04",
    title: "Đối soát",
    desc: "Nhận báo cáo đối soát và thanh toán định kỳ.",
  },
];

export function ProcessSection() {
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
    <section id="process" className="py-20 sm:py-24 bg-white">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3a4a]">
            Bắt đầu chỉ với 4 bước
          </h2>
          <div className="mt-4 w-16 h-1 bg-[#0ea5e9] rounded-full mx-auto" />
        </div>

        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-[#0ea5e9]/20 via-[#0ea5e9]/40 to-[#0ea5e9]/20" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`relative text-center transition-all duration-600 ${
                  visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Step circle */}
                <div className="relative inline-flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a3a4a] to-[#2a5a6a] flex items-center justify-center shadow-lg shadow-[#1a3a4a]/20 mb-5">
                    <s.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#f97316] text-white text-xs font-bold flex items-center justify-center shadow-md">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1a3a4a] mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-[220px] mx-auto">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
