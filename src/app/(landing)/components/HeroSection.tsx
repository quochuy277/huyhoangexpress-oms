"use client";

export function HeroSection() {
  const handleCTA = () => {
    const el = document.querySelector("#register");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLearnMore = () => {
    const el = document.querySelector("#stats");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-[#e0f7fa] via-[#e8f4f8] to-[#f0f9ff]">
      {/* Geometric pattern */}
      <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="hero-dots"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1.5" fill="#1a3a4a" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-dots)" />
        </svg>
      </div>

      {/* Decorative shapes */}
      <div
        className="absolute top-20 right-[10%] w-72 h-72 rounded-full bg-[#0ea5e9]/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-20 left-[5%] w-96 h-96 rounded-full bg-[#1a3a4a]/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full bg-[#1a3a4a]/10 text-[#1a3a4a] text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Đang phục vụ hơn 4.000 bưu cục toàn quốc
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1a3a4a] leading-[1.1] tracking-tight">
            Giải pháp gửi hàng{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0ea5e9] to-[#0284c7]">
              tối ưu nhất
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
            Với hệ thống hơn 4.000 bưu cục phát hàng toàn quốc, cùng với dịch
            vụ hỗ trợ tận tâm nhiệt tình, luôn đảm bảo đơn hàng của bạn được
            giao đến tận tay khách hàng với tối ưu chi phí và thời gian nhất.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleCTA}
              className="px-8 py-3.5 text-base font-bold text-white bg-[#f97316] hover:bg-[#ea580c] rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5"
            >
              Đăng ký gửi hàng ngay
            </button>
            <button
              onClick={handleLearnMore}
              className="px-8 py-3.5 text-base font-bold text-[#1a3a4a] border-2 border-[#1a3a4a]/20 hover:border-[#1a3a4a]/40 hover:bg-[#1a3a4a]/5 rounded-xl transition-all duration-200"
            >
              Tìm hiểu thêm ↓
            </button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Miễn phí đăng ký
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Không ràng buộc
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              Hỗ trợ 24/7
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
