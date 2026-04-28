import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "Chị Thanh",
    shop: "Shop thời trang Thanh Tú",
    text: "Từ ngày gửi qua Huy Hoàng Express, shop theo dõi đơn và COD nhẹ hơn nhiều. Có phát sinh thì được hỗ trợ nhanh.",
  },
  {
    name: "Anh Đức",
    shop: "Phụ kiện điện thoại",
    text: "Trước đây phải vào nhiều tài khoản nhà vận chuyển. Giờ shop chỉ cần một đầu mối nên tiết kiệm rất nhiều thời gian.",
  },
  {
    name: "Chị Hương",
    shop: "Mỹ phẩm online",
    text: "Đơn hoàn và khiếu nại được theo sát hơn. Quan trọng nhất là số liệu COD rõ để đối chiếu cuối ngày.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#f97316]">
            Khách hàng
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-normal text-[#123241] sm:text-4xl">
            Các shop đánh giá cao sự rõ ràng trong vận hành
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <article
              key={item.name}
              className="rounded-2xl border border-slate-100 bg-[#f8fafc] p-6 transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-slate-200/70"
            >
              <div className="flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-600">“{item.text}”</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#123241] text-sm font-extrabold text-white">
                  {item.name.split(" ").pop()?.charAt(0)}
                </div>
                <div>
                  <p className="font-extrabold text-[#123241]">{item.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{item.shop}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
