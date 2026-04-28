import { ClipboardEdit, FileSpreadsheet, PackageSearch, PhoneCall } from "lucide-react";

const STEPS = [
  {
    icon: PhoneCall,
    title: "Đăng ký",
    desc: "Để lại thông tin shop, đội ngũ Huy Hoàng Express liên hệ tư vấn quy trình phù hợp.",
  },
  {
    icon: ClipboardEdit,
    title: "Tạo đơn",
    desc: "Shop gửi thông tin đơn hàng, lựa chọn tuyến giao và nhà vận chuyển theo nhu cầu.",
  },
  {
    icon: PackageSearch,
    title: "Theo dõi",
    desc: "Cập nhật trạng thái đơn, cảnh báo phát sinh và xử lý hoàn/khiếu nại khi cần.",
  },
  {
    icon: FileSpreadsheet,
    title: "Đối soát COD",
    desc: "Tổng hợp COD, đơn hoàn, phí vận chuyển và báo cáo rõ ràng theo kỳ.",
  },
];

export function ProcessSection() {
  return (
    <section id="process" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#f97316]">
            Quy trình
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-normal text-[#123241] sm:text-4xl">
            Bắt đầu gửi hàng chỉ với 4 bước
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600">
            Quy trình được thiết kế ngắn gọn để shop có thể thử nhanh, vận hành thật và mở rộng khi đơn tăng.
          </p>
        </div>

        <div className="relative mt-14">
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent lg:block" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <article key={step.title} className="relative rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#123241] text-white shadow-lg shadow-[#123241]/20">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="absolute right-5 top-5 rounded-full bg-[#f97316] px-2.5 py-1 text-xs font-extrabold text-white">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-[#123241]">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{step.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
