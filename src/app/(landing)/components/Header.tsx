"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "Giới thiệu", href: "#about" },
  { label: "Dịch vụ", href: "#services" },
  { label: "Đối tác", href: "#partners" },
  { label: "Quy trình", href: "#process" },
  { label: "Liên hệ", href: "#register" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-slate-200/80 bg-white/95 shadow-sm backdrop-blur"
          : "border-transparent bg-white"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label="Về đầu trang"
          >
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
              <Image
                src="/images/logo.png"
                alt="Huy Hoàng Express"
                width={40}
                height={40}
                priority
                className="h-full w-full object-contain"
              />
            </span>
            <span className="truncate text-lg font-extrabold text-[#123241]">
              Huy Hoàng Express
            </span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-[#123241]"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={() => handleNavClick("#register")}
              className="rounded-lg bg-[#f97316] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#ea580c]"
            >
              Đăng ký gửi hàng
            </button>
            <Link
              href="/login"
              className="rounded-lg border border-[#123241]/20 px-4 py-2.5 text-sm font-bold text-[#123241] transition hover:border-[#123241]/40 hover:bg-[#123241]/5"
            >
              Đăng nhập
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg p-2 text-[#123241] transition hover:bg-slate-100 md:hidden"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white shadow-lg md:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="block w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#123241]"
              >
                {link.label}
              </button>
            ))}
            <div className="grid grid-cols-1 gap-2 pt-3">
              <button
                onClick={() => handleNavClick("#register")}
                className="rounded-lg bg-[#f97316] px-4 py-3 text-sm font-bold text-white"
              >
                Đăng ký gửi hàng
              </button>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-[#123241]/20 px-4 py-3 text-center text-sm font-bold text-[#123241]"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
