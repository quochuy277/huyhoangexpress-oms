"use client";

import Image from "next/image";

const PARTNERS = [
  { name: "GHN", file: "ghn.png" },
  { name: "GHTK", file: "ghtk.png" },
  { name: "SPX", file: "spx.png" },
  { name: "J&T", file: "jnt.png" },
  { name: "Best Express", file: "best.png" },
];

export function PartnersSection() {
  // Double the list for seamless loop
  const logos = [...PARTNERS, ...PARTNERS];

  return (
    <section className="py-16 sm:py-20 bg-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3a4a]">
            Đối tác vận chuyển
          </h2>
          <div className="mt-4 w-16 h-1 bg-[#0ea5e9] rounded-full mx-auto" />
          <p className="mt-6 text-lg text-slate-500">
            Chúng tôi hợp tác với 5 nhà vận chuyển hàng đầu Việt Nam
          </p>
        </div>
      </div>

      {/* Marquee container */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee hover:[animation-play-state:paused]">
          {logos.map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className="flex items-center justify-center shrink-0 mx-6 sm:mx-10 lg:mx-14"
            >
              <div className="w-32 h-20 sm:w-40 sm:h-24 flex items-center justify-center p-3 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-[#0ea5e9]/30 hover:shadow-lg hover:shadow-[#0ea5e9]/5 transition-all duration-300">
                <Image
                  src={`/images/partners/${p.file}?v=2`}
                  alt={p.name}
                  width={160}
                  height={80}
                  className="object-contain max-h-14 sm:max-h-16"
                  unoptimized
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mt-10 text-center text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Gửi qua Huy Hoàng Express, bạn được hưởng giá chiết khấu tốt hơn gửi
          trực tiếp, chỉ cần quản lý qua một đầu mối duy nhất.
        </p>
      </div>
    </section>
  );
}
