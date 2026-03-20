import Image from "next/image";
import { MapPin, Phone, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1a3a4a] text-white py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-12">
          {/* Logo + Company name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-white/10 p-1">
              <Image
                src="/images/logo.png"
                alt="Huy Hoàng Express"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span className="text-lg font-bold">Huy Hoàng Express</span>
          </div>

          {/* Contact info */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-white/70">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0 text-white/50" />
              <span>Chung cư Vicoland Huế, phường Vỹ Dạ, TP. Huế</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 shrink-0 text-white/50" />
              <a href="tel:0963537634" className="hover:text-white transition-colors">
                0963 537 634
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 shrink-0 text-white/50" />
              <a href="mailto:ghsv.huyhoang@gmail.com" className="hover:text-white transition-colors">
                ghsv.huyhoang@gmail.com
              </a>
            </div>
          </div>
        </div>

        <hr className="my-8 border-white/10" />

        <p className="text-center text-sm text-white/40">
          © 2026 Huy Hoàng Express. All rights reserved.
        </p>
      </div>

      {/* LocalBusiness JSON-LD */}
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
