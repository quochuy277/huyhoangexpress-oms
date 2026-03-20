"use client";

import { MessageCircle } from "lucide-react";

export function ZaloChatWidget() {
  return (
    <a
      href="https://zalo.me/0963537634"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 group"
      aria-label="Chat qua Zalo"
    >
      <div className="relative">
        {/* Ping animation */}
        <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-30" />
        {/* Button */}
        <div className="relative w-14 h-14 rounded-full bg-[#0068FF] hover:bg-[#0050CC] shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl">
          <MessageCircle className="w-6 h-6 text-white" />
        </div>
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Chat Zalo
        <div className="absolute top-full right-5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
      </div>
    </a>
  );
}
