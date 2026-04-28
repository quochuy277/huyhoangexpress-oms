import Image from "next/image";
import { BarChart3, FileCheck2, PackagePlus, RotateCcw, Truck, WalletCards } from "lucide-react";

const SERVICES = [
  {
    icon: Truck,
    title: "Giao hàng toàn quốc",
    desc: "Kết nối nhiều nhà vận chuyển để shop chọn tuyến phù hợp theo khu vực, tốc độ và chi phí.",
  },
  {
    icon: WalletCards,
    title: "Thu hộ COD",
    desc: "Theo dõi dòng tiền thu hộ, hỗ trợ đối soát minh bạch và giảm sai lệch khi đơn tăng nhanh.",
  },
  {
    icon: PackagePlus,
    title: "Quản lý đơn hàng",
    desc: "Tập trung trạng thái đơn, lịch sử xử lý và thông tin vận chuyển vào một đầu mối.",
  },
  {
    icon: RotateCcw,
    title: "Xử lý hoàn hàng",
    desc: "Theo dõi đơn hoàn, cảnh báo phát sinh và hỗ trợ shop giảm thất thoát khi khách không nhận.",
  },
  {
    icon: FileCheck2,
    title: "Khiếu nại đền bù",
    desc: "Đội ngũ hỗ trợ làm việc với nhà vận chuyển khi có thất lạc, hư hỏng hoặc giao chậm.",
  },
  {
    icon: BarChart3,
    title: "Báo cáo vận hành",
    desc: "Tổng hợp số đơn, trạng thái giao, tỷ lệ hoàn và COD để chủ shop ra quyết định nhanh.",
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="relative isolate overflow-hidden bg-[#f8fafc] py-20 sm:py-24">
      <div className="absolute inset-x-0 top-0 -z-10 h-[520px] opacity-90">
        <Image
          src="/images/landing/delivery-soft-bg.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.32]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#f8fafc]/62 via-[#f8fafc]/82 to-[#f8fafc]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#f97316]">
            Dịch vụ
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-normal text-[#123241] sm:text-4xl">
            Dịch vụ dành cho shop tăng trưởng
          </h2>
          <p className="mt-5 text-base leading-8 text-slate-600">
            Tập trung vào những phần shop cần nhất: phí vận chuyển, COD, trạng thái đơn, hoàn hàng
            và xử lý phát sinh với nhà vận chuyển.
          </p>
        </div>

        <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl border border-white/80 shadow-xl shadow-slate-200/70 lg:hidden">
          <Image
            src="/images/landing/delivery-soft-bg.png"
            alt="Nhân viên giao hàng bàn giao thùng hàng cạnh xe tải"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <article
              key={service.title}
              className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200/70"
            >
              <div className="mb-5 inline-flex rounded-xl bg-[#eef8fb] p-3 text-sky-700 transition group-hover:bg-[#123241] group-hover:text-white">
                <service.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-extrabold text-[#123241]">{service.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{service.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
