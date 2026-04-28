import { BadgeCheck, Headphones, LineChart, ShieldCheck } from "lucide-react";

const BENEFITS = [
  {
    icon: BadgeCheck,
    title: "Tối ưu phí vận chuyển",
    desc: "So sánh và lựa chọn tuyến giao phù hợp để shop không bị phụ thuộc vào một nhà vận chuyển duy nhất.",
  },
  {
    icon: LineChart,
    title: "Đối soát COD rõ ràng",
    desc: "Theo dõi tiền thu hộ theo trạng thái đơn, hạn chế thiếu sót khi đối chiếu số liệu cuối kỳ.",
  },
  {
    icon: ShieldCheck,
    title: "Kiểm soát rủi ro đơn hàng",
    desc: "Phát hiện đơn chậm, đơn hoàn, đơn có vấn đề sớm hơn để giảm chi phí phát sinh.",
  },
  {
    icon: Headphones,
    title: "Có người hỗ trợ khi cần",
    desc: "Đội ngũ vận hành đồng hành với shop trong các tình huống giao chậm, khiếu nại hoặc cần tra soát.",
  },
];

export function BenefitsSection() {
  return (
    <section className="bg-[#123241] py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-orange-300">
              Lý do chọn
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-normal sm:text-4xl">
              Vận hành gọn hơn, số liệu rõ hơn, khách hàng được phục vụ nhanh hơn
            </h2>
            <p className="mt-5 text-base leading-8 text-white/70">
              Thiết kế dịch vụ xoay quanh nhu cầu thực tế của shop online: giảm việc tay chân,
              kiểm soát tiền COD và xử lý phát sinh trước khi ảnh hưởng đến khách.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {BENEFITS.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 transition hover:-translate-y-1 hover:bg-white/[0.09]"
              >
                <div className="mb-5 inline-flex rounded-xl bg-white/10 p-3 text-sky-200">
                  <benefit.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-extrabold">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/68">{benefit.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
