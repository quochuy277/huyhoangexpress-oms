import Image from "next/image";

const PARTNERS = [
  { name: "GHN", file: "ghn.png" },
  { name: "GHTK", file: "ghtk.png" },
  { name: "SPX", file: "spx.png" },
  { name: "J&T", file: "jnt.png" },
  { name: "Best Express", file: "best.png" },
];

export function PartnersSection() {
  return (
    <section id="partners" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-100 bg-[#f8fafc] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#f97316]">
                Đối tác vận chuyển
              </span>
              <h2 className="mt-4 text-3xl font-extrabold text-[#123241] sm:text-4xl">
                Một kết nối, nhiều lựa chọn giao hàng
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Huy Hoàng Express hỗ trợ shop làm việc với các nhà vận chuyển phổ biến tại Việt Nam
                qua một đầu mối vận hành.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {PARTNERS.map((partner) => (
                <div
                  key={partner.name}
                  className="flex h-24 items-center justify-center rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"
                >
                  <Image
                    src={`/images/partners/${partner.file}?v=2`}
                    alt={partner.name}
                    width={140}
                    height={70}
                    unoptimized
                    className="max-h-14 w-auto object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
