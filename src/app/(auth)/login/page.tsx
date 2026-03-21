"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/lib/actions/auth-actions";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f0f4f8 0%, #e8eef5 50%, #dfe7f0 100%)" }}>
      {/* Subtle decorative shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#1a3a4a]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#1a3a4a]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#1a3a4a]/[0.02] rounded-full blur-3xl" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(26,58,74,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(26,58,74,.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-32 h-32 mb-3">
            <Image
              src="/images/LOGO.png"
              alt="Huy Hoàng Express"
              width={128}
              height={128}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-[#1a3a4a] tracking-tight">
            HuyHoang Express
          </h1>
          <p className="text-[#1a3a4a]/50 text-sm mt-1">
            Hệ thống quản lý đơn hàng
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-8 shadow-xl shadow-[#1a3a4a]/5">
          <h2 className="text-xl font-semibold text-[#1a3a4a] mb-6">Đăng nhập</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#1a3a4a]/70"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="email@company.com"
                className="w-full px-4 py-3 rounded-xl bg-[#f0f4f8] border border-[#1a3a4a]/10 text-[#1a3a4a] placeholder-[#1a3a4a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a3a4a]/30 focus:border-transparent transition-all text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#1a3a4a]/70"
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-[#f0f4f8] border border-[#1a3a4a]/10 text-[#1a3a4a] placeholder-[#1a3a4a]/30 focus:outline-none focus:ring-2 focus:ring-[#1a3a4a]/30 focus:border-transparent transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1a3a4a]/40 hover:text-[#1a3a4a] transition-colors"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1a3a4a] text-white font-semibold text-sm hover:bg-[#1e4d5e] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#1a3a4a]/20 hover:shadow-[#1a3a4a]/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-[#1a3a4a]/30 text-xs mt-6">
          © 2026 HuyHoang Express. Tất cả quyền được bảo lưu.
        </p>
      </div>
    </div>
  );
}
