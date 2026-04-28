import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";

const LINKS = ["Giới thiệu", "Dịch vụ", "Đối tác", "Quy trình", "Liên hệ"];

export function Footer() {
  return (
    <footer className="bg-[#0b2230] py-12 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="relative h-11 w-11 overflow-hidden rounded-lg bg-white p-1.5">
                <Image
                  src="/images/logo.png"
                  alt="Huy Hoàng Express"
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="text-xl font-extrabold">Huy Hoàng Express</span>
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/60">
              Giải pháp vận hành giao hàng, thu hộ COD và quản lý đơn hàng dành cho shop online
              cần tăng trưởng bền vững.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-white/45">
              Điều hướng
            </h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {LINKS.map((link) => (
                <span key={link} className="text-sm font-semibold text-white/68">
                  {link}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-white/45">
              Liên hệ
            </h3>
            <div className="mt-5 space-y-4 text-sm text-white/68">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-sky-200" />
                <span>Chung cư Vicoland Huế, phường Vỹ Dạ, TP. Huế</span>
              </div>
              <a href="tel:0963537634" className="flex gap-3 transition hover:text-white">
                <Phone className="h-5 w-5 shrink-0 text-orange-300" />
                <span>0963 537 634</span>
              </a>
              <a href="mailto:ghsv.huyhoang@gmail.com" className="flex gap-3 transition hover:text-white">
                <Mail className="h-5 w-5 shrink-0 text-sky-200" />
                <span>ghsv.huyhoang@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-white/38">
          © 2026 Huy Hoàng Express. All rights reserved.
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "Huy Hoàng Express",
            description:
              "Đơn vị trung gian vận chuyển, cầu nối giữa cửa hàng online và các đối tác vận chuyển uy tín.",
            telephone: "+84963537634",
            email: "ghsv.huyhoang@gmail.com",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Chung cư Vicoland Huế",
              addressLocality: "Huế",
              addressRegion: "Thừa Thiên Huế",
              addressCountry: "VN",
            },
            areaServed: "VN",
          }),
        }}
      />
    </footer>
  );
}
