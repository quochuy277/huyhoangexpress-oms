"use client";

import Image from "next/image";
import { ArrowRight, Check, ClipboardCheck, Clock3, Coins } from "lucide-react";

const TRUST_ITEMS = ["Miễn phí đăng ký", "Không ràng buộc", "Hỗ trợ 24/7"];

export function HeroSection() {
  const scrollTo = (selector: string) => {
    document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative isolate overflow-hidden bg-[#eef8fb] pt-24 sm:pt-28 lg:pt-32">
      <Image
        src="/images/landing/hero-logistics-photo.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[62%_center]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#eef8fb_0%,rgba(238,248,251,0.96)_42%,rgba(238,248,251,0.58)_60%,rgba(238,248,251,0.16)_78%,rgba(238,248,251,0)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/20 via-transparent to-[#eef8fb]/88" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_22%,rgba(14,165,233,0.16),transparent_32%)]" />
      <div className="absolute inset-0 -z-10 opacity-[0.04] [background-image:linear-gradient(#123241_1px,transparent_1px),linear-gradient(90deg,#123241_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 overflow-hidden px-4 pb-16 sm:px-6 sm:pb-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:pb-24">
        <div className="min-w-0 max-w-2xl">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#123241]/10 bg-white/75 px-3 py-1.5 text-xs font-bold text-[#123241] shadow-sm shadow-slate-200/60 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            34 tỉnh thành • 5 NVC • COD minh bạch
          </div>

          <h1 className="mt-7 text-3xl font-extrabold leading-[1.1] tracking-normal text-[#123241] sm:text-5xl lg:text-6xl">
            <span className="block">Vận hành giao hàng</span>
            <span className="block">chuyên nghiệp</span>
            <span className="block">cho shop online</span>
          </h1>

          <p className="mt-6 max-w-[20.5rem] text-base leading-8 text-slate-600 sm:max-w-xl sm:text-lg">
            Một đầu mối để tạo đơn, theo dõi vận chuyển, xử lý hoàn hàng và đối soát COD rõ ràng.
            Huy Hoàng Express giúp shop giảm việc thủ công, kiểm soát dòng tiền và phục vụ khách nhanh hơn.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => scrollTo("#register")}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#f97316] px-6 text-base font-bold text-white shadow-lg shadow-orange-500/25 transition hover:-translate-y-0.5 hover:bg-[#ea580c]"
            >
              Đăng ký gửi hàng
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => scrollTo("#process")}
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#123241]/20 bg-white/70 px-6 text-base font-bold text-[#123241] transition hover:border-[#123241]/40 hover:bg-white"
            >
              Xem quy trình
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {TRUST_ITEMS.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm shadow-slate-200/60"
              >
                <Check className="h-4 w-4 text-emerald-500" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full min-w-0 max-w-[calc(100vw-2rem)] lg:max-w-none">
          <div className="mt-4 grid grid-cols-1 gap-3 text-xs font-semibold text-slate-600 sm:grid-cols-3 sm:text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-3 shadow-sm">
              <ClipboardCheck className="h-4 w-4 text-sky-600" />
              Tạo đơn nhanh
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-3 shadow-sm">
              <Clock3 className="h-4 w-4 text-emerald-600" />
              Realtime
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-3 shadow-sm">
              <Coins className="h-4 w-4 text-orange-500" />
              COD rõ ràng
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
