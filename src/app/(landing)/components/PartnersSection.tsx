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
  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3a4a]">
            Đối tác vận chuyển
          </h2>
          <div className="mt-4 w-16 h-1 bg-[#0ea5e9] rounded-full mx-auto" />
          <p className="mt-6 text-lg text-slate-500">
            Chúng tôi hợp tác với 5 nhà vận chuyển hàng đầu Việt Nam
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-16">
          {PARTNERS.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-center w-28 h-16 sm:w-36 sm:h-20 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
            >
              <Image
                src={`/images/partners/${p.file}`}
                alt={p.name}
                width={140}
                height={56}
                className="object-contain max-h-14 sm:max-h-16"
              />
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-base text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Gửi qua Huy Hoàng Express, bạn được hưởng giá chiết khấu tốt hơn gửi
          trực tiếp, chỉ cần quản lý qua một đầu mối duy nhất.
        </p>
      </div>
    </section>
  );
}
