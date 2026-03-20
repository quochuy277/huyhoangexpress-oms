"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Chi phí gửi hàng qua Huy Hoàng Express là bao nhiêu?",
    a: "Chỉ từ 15.000đ/đơn tùy khối lượng và khoảng cách. Liên hệ để nhận bảng giá chi tiết.",
  },
  {
    q: "Thời gian nhận tiền COD sau khi giao thành công?",
    a: "Đối soát hàng ngày, tiền COD được chuyển nhanh chóng theo lịch đối soát.",
  },
  {
    q: "Làm sao theo dõi trạng thái đơn hàng?",
    a: "Qua hệ thống quản lý đơn hàng trực tuyến, cập nhật realtime từ nhà vận chuyển.",
  },
  {
    q: "Nếu hàng bị thất lạc/hư hỏng thì sao?",
    a: "Cam kết đền bù 100% giá trị hàng hóa khi thất lạc hoặc hư hỏng do vận chuyển.",
  },
  {
    q: "Có cần ký hợp đồng không?",
    a: "Không bắt buộc. Bạn có thể dùng thử trước, linh hoạt không ràng buộc.",
  },
  {
    q: "Tôi cần gửi tối thiểu bao nhiêu đơn/tháng?",
    a: "Không yêu cầu số lượng tối thiểu. Phù hợp cả shop nhỏ lẫn shop lớn.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 sm:py-24 bg-[#f8fafc]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3a4a]">
            Câu hỏi thường gặp
          </h2>
          <div className="mt-4 w-16 h-1 bg-[#0ea5e9] rounded-full mx-auto" />
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="bg-white rounded-xl border border-slate-100 overflow-hidden transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-semibold text-[#1a3a4a] pr-4">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="px-6 pb-4 text-sm text-slate-500 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ JSON-LD Schema */}
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
