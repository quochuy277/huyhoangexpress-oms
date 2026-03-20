"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 right-6 z-40 w-11 h-11 rounded-full bg-[#1a3a4a] hover:bg-[#2a5a6a] text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
      aria-label="Cuộn lên đầu trang"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
