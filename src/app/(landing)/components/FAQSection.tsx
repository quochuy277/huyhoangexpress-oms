"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "Chi phí gửi hàng qua Huy Hoàng Express là bao nhiêu?",
    a: "Chi phí phụ thuộc tuyến giao, khối lượng và nhà vận chuyển. Đội ngũ sẽ tư vấn bảng giá phù hợp sau khi nắm sản lượng và khu vực gửi hàng của shop.",
  },
  {
    q: "Shop có cần cam kết số đơn tối thiểu không?",
    a: "Không bắt buộc cam kết ngay từ đầu. Shop có thể đăng ký tư vấn, thử quy trình và mở rộng khi vận hành ổn định.",
  },
  {
    q: "Tiền COD được đối soát như thế nào?",
    a: "COD được theo dõi theo trạng thái đơn và tổng hợp rõ ràng để shop đối chiếu. Lịch chuyển tiền sẽ được tư vấn theo quy trình vận hành thực tế.",
  },
  {
    q: "Nếu đơn bị chậm, hoàn hoặc thất lạc thì sao?",
    a: "Huy Hoàng Express hỗ trợ kiểm tra trạng thái, làm việc với nhà vận chuyển và theo dõi khiếu nại để giảm thời gian xử lý cho shop.",
  },
  {
    q: "Tôi đang dùng nhiều nhà vận chuyển rồi, có chuyển sang được không?",
    a: "Được. Huy Hoàng Express đóng vai trò một đầu mối hỗ trợ shop quản lý nhiều lựa chọn vận chuyển thuận tiện hơn.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-[#f8fafc] py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#f97316]">
            FAQ
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-normal text-[#123241] sm:text-4xl">
            Câu hỏi thường gặp
          </h2>
        </div>

        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <article key={faq.q} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                  aria-expanded={isOpen}
                >
                  <span className="font-extrabold text-[#123241]">{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div className={`grid transition-all duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm leading-7 text-slate-600 sm:px-6">{faq.a}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ_ITEMS.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }),
        }}
      />
    </section>
  );
}
