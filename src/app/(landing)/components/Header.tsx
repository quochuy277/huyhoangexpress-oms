"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Giới thiệu", href: "#about" },
  { label: "Dịch vụ", href: "#services" },
  { label: "Quy trình", href: "#process" },
  { label: "Liên hệ", href: "#register" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-sm shadow-md"
          : "bg-white"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="relative h-9 w-9 overflow-hidden rounded-lg">
              <Image
                src="/images/logo.png"
                alt="Huy Hoàng Express"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <span className="text-lg font-bold text-[#1a3a4a]">
              Huy Hoàng Express
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-[#1a3a4a] rounded-lg hover:bg-slate-50 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => handleNavClick("#register")}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#f97316] hover:bg-[#ea580c] rounded-lg transition-colors shadow-sm"
            >
              Đăng ký gửi hàng
            </button>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-[#1a3a4a] border border-[#1a3a4a]/30 hover:border-[#1a3a4a]/60 hover:bg-[#1a3a4a]/5 rounded-lg transition-colors"
            >
              Đăng nhập
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="block w-full text-left px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-[#1a3a4a] hover:bg-slate-50 rounded-lg transition-colors"
              >
                {link.label}
              </button>
            ))}
            <hr className="my-2 border-slate-100" />
            <button
              onClick={() => handleNavClick("#register")}
              className="block w-full px-3 py-2.5 text-sm font-semibold text-white bg-[#f97316] hover:bg-[#ea580c] rounded-lg transition-colors text-center"
            >
              Đăng ký gửi hàng
            </button>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block w-full px-3 py-2.5 text-sm font-semibold text-[#1a3a4a] border border-[#1a3a4a]/30 hover:bg-[#1a3a4a]/5 rounded-lg transition-colors text-center"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
