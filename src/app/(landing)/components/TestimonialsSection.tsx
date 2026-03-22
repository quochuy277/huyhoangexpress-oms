"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";

const TESTIMONIALS = [
    {
        name: "Chị Thanh",
        shop: "Shop thời trang Thanh Tú",
        text: "Mình gửi hàng qua Huy Hoàng được hơn 1 năm rồi, giá cước rẻ hơn gửi trực tiếp, đối soát nhanh, nhân viên hỗ trợ nhiệt tình.",
        rating: 5,
    },
    {
        name: "Anh Đức",
        shop: "Shop phụ kiện điện thoại",
        text: "Trước mình phải quản lý nhiều tài khoản NVC, giờ chỉ cần qua Huy Hoàng là xong. Tiết kiệm rất nhiều thời gian cho shop.",
        rating: 5,
    },
    {
        name: "Chị Hương",
        shop: "Shop mỹ phẩm online",
        text: "Hỗ trợ khiếu nại rất tốt, có đơn bị thất lạc được đền bù nhanh chóng. Đội ngũ CSKH rất tận tâm luôn.",
        rating: 5,
    },
];

export function TestimonialsSection() {
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
            { threshold: 0.15 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <section className="py-20 sm:py-24 bg-white">
            <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-14">
                    <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3a4a]">
                        Khách hàng nói gì?
                    </h2>
                    <div className="mt-4 w-16 h-1 bg-[#0ea5e9] rounded-full mx-auto" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {TESTIMONIALS.map((t, i) => (
                        <div
                            key={i}
                            className={`relative p-6 sm:p-8 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-500 ${visible
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-8"
                                }`}
                            style={{ transitionDelay: `${i * 120}ms` }}
                        >
                            {/* Quote mark */}
                            <div className="absolute top-4 right-6 text-6xl leading-none text-[#0ea5e9]/10 font-serif select-none">
                                &ldquo;
                            </div>

                            {/* Stars */}
                            <div className="flex gap-0.5 mb-4">
                                {Array.from({ length: t.rating }).map((_, j) => (
                                    <Star
                                        key={j}
                                        className="w-4 h-4 fill-amber-400 text-amber-400"
                                    />
                                ))}
                            </div>

                            {/* Quote */}
                            <p className="text-slate-600 leading-relaxed mb-6 relative z-10">
                                &ldquo;{t.text}&rdquo;
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] flex items-center justify-center text-white font-bold text-sm shadow-md">
                                    {t.name.charAt(t.name.indexOf(" ") + 1) || t.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-semibold text-[#1a3a4a] text-sm">
                                        {t.name}
                                    </div>
                                    <div className="text-xs text-slate-400">{t.shop}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
