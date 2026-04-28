import Image from "next/image";
import { AlertTriangle, ArrowRight, Banknote, Clock3, Route } from "lucide-react";

const PAINS = [
  {
    icon: Banknote,
    title: "Chi phí vận chuyển khó kiểm soát",
    desc: "Shop phải so sánh nhiều bảng giá, nhiều chính sách và khó biết đơn nào nên đi nhà vận chuyển nào.",
  },
  {
    icon: Clock3,
    title: "Theo dõi đơn tốn nhiều thời gian",
    desc: "Mỗi kênh một trạng thái, nhân sự phải kiểm tra thủ công khi khách hỏi hoặc khi đơn có vấn đề.",
  },
  {
    icon: AlertTriangle,
    title: "Hoàn hàng và khiếu nại làm gián đoạn vận hành",
    desc: "Đơn chậm, thất lạc, hư hỏng hoặc hoàn không được xử lý sớm sẽ ảnh hưởng lợi nhuận và trải nghiệm khách.",
  },
];

const SOLUTIONS = [
  "Một đầu mối kết nối GHN, GHTK, SPX, J&T, Best Express",
  "Theo dõi trạng thái đơn và dòng tiền COD rõ ràng",
  "Đội ngũ hỗ trợ xử lý khiếu nại, hoàn hàng và đối soát",
];

export function AboutSection() {
  return (
    <section id="about" className="relative isolate overflow-hidden bg-white py-20 sm:py-24">
      <div className="absolute inset-y-0 right-0 -z-10 hidden w-[52%] lg:block">
        <Image
          src="/images/landing/warehouse-soft-bg.png"
          alt=""
          fill
          sizes="48vw"
          className="object-cover opacity-[0.34]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/72 to-white/20" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="min-w-0">
            <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#f97316]">
              Bài toán vận hành
            </span>
            <h2 className="mt-4 max-w-[21rem] break-words text-2xl font-extrabold tracking-normal text-[#123241] sm:max-w-none sm:text-4xl">
              Shop online cần nhiều hơn một đơn vị giao hàng
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
              Khi đơn tăng, chi phí ship, COD, hoàn hàng và khiếu nại trở thành bài toán vận hành.
              Huy Hoàng Express gom các bước quan trọng vào một quy trình dễ kiểm soát.
            </p>

            <div className="relative mt-7 aspect-[16/9] overflow-hidden rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/70 lg:hidden">
              <Image
                src="/images/landing/warehouse-soft-bg.png"
                alt="Kho hàng và thùng hàng được chuẩn bị trước khi giao"
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>

            <div className="mt-8 min-w-0 space-y-4 overflow-hidden rounded-2xl bg-[#123241] p-6 text-white shadow-xl shadow-[#123241]/16">
              {SOLUTIONS.map((item) => (
                <div key={item} className="flex min-w-0 gap-3">
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-sky-300" />
                  <p className="min-w-0 break-words text-sm font-semibold leading-6 text-white/82">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid min-w-0 gap-4">
            {PAINS.map((item) => (
              <article
                key={item.title}
                className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70 p-6 transition hover:-translate-y-1 hover:border-sky-200 hover:bg-white hover:shadow-xl hover:shadow-slate-200/60"
              >
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
                  <div className="h-fit rounded-xl bg-white p-3 text-[#123241] shadow-sm ring-1 ring-slate-100">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-extrabold text-[#123241]">{item.title}</h3>
                    <p className="mt-2 break-words text-sm leading-7 text-slate-600">{item.desc}</p>
                  </div>
                </div>
              </article>
            ))}

            <article className="min-w-0 overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/80 p-6">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
                <div className="h-fit rounded-xl bg-white p-3 text-sky-600 shadow-sm">
                  <Route className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-extrabold text-[#123241]">
                    Kết quả là một luồng xử lý rõ ràng hơn
                  </h3>
                  <p className="mt-2 break-words text-sm leading-7 text-slate-600">
                    Tạo đơn, chọn tuyến, theo dõi trạng thái, xử lý phát sinh và đối soát COD đều được
                    chuẩn hóa cho đội vận hành của shop.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
