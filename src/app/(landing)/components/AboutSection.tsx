"use client";

import { useEffect, useRef, useState } from "react";

export function AboutSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" className="py-20 sm:py-24 bg-white">
      <div
        ref={ref}
        className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3a4a]">
            Về Huy Hoàng Express
          </h2>
          <div className="mt-4 w-16 h-1 bg-[#0ea5e9] rounded-full mx-auto" />
          <p className="mt-8 text-lg text-slate-600 leading-relaxed">
            Huy Hoàng Express là đơn vị trung gian vận chuyển, đóng vai trò cầu
            nối giữa cửa hàng online và các đối tác vận chuyển uy tín. Chúng
            tôi giúp các shop tiết kiệm thời gian, giảm chi phí vận chuyển và
            quản lý đơn hàng hiệu quả thông qua hệ thống công nghệ hiện đại.
          </p>
        </div>
      </div>
    </section>
  );
}
