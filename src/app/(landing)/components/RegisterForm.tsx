"use client";

import { useState } from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

const PRODUCT_OPTIONS = [
  "Thời trang",
  "Mỹ phẩm",
  "Thực phẩm",
  "Điện tử",
  "Khác",
];

const ORDER_OPTIONS = ["Dưới 30", "30-100", "100-500", "Trên 500"];

type FormState = "idle" | "loading" | "success" | "error";

export function RegisterForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    shopName: "",
    phone: "",
    contactPerson: "",
    emailZalo: "",
    productType: "",
    estimatedOrders: "",
    note: "",
    website: "", // honeypot
  });

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.shopName.trim()) {
      setErrorMsg("Vui lòng nhập tên shop/cửa hàng.");
      setState("error");
      return;
    }
    if (!form.phone.trim() || !/^0\d{9}$/.test(form.phone.trim())) {
      setErrorMsg("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).");
      setState("error");
      return;
    }

    setState("loading");

    try {
      const res = await fetch("/api/landing/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setState("success");
      } else if (res.status === 409) {
        setErrorMsg(
          data.message ||
            "Thông tin đã được ghi nhận trước đó. Chúng tôi sẽ sớm liên hệ bạn!"
        );
        setState("error");
      } else if (res.status === 429) {
        setErrorMsg(
          "Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau vài phút."
        );
        setState("error");
      } else {
        setErrorMsg(
          data.error ||
            "Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ hotline 0963 537 634."
        );
        setState("error");
      }
    } catch {
      setErrorMsg(
        "Không thể kết nối. Vui lòng kiểm tra mạng và thử lại."
      );
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <section id="register" className="py-20 sm:py-24 bg-white">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
          <div className="inline-flex p-4 rounded-full bg-green-50 mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1a3a4a]">
            Cảm ơn bạn đã đăng ký!
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Chúng tôi sẽ liên hệ bạn trong 24 giờ.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="register" className="py-20 sm:py-24 bg-white">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a3a4a]">
            Đăng ký gửi hàng
          </h2>
          <div className="mt-4 w-16 h-1 bg-[#0ea5e9] rounded-full mx-auto" />
          <p className="mt-6 text-lg text-slate-500">
            Để lại thông tin, chúng tôi sẽ liên hệ bạn trong 24 giờ
          </p>
        </div>

        {/* Error banner */}
        {state === "error" && errorMsg && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot — hidden from humans */}
          <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true">
            <label>
              Website
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
              />
            </label>
          </div>

          {/* Required fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-[#1a3a4a] mb-1.5">
                Tên shop / cửa hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.shopName}
                onChange={(e) => updateField("shopName", e.target.value)}
                placeholder="Ví dụ: Shop Minh Thư"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/40 focus:border-[#0ea5e9] transition-colors text-slate-700 placeholder:text-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#1a3a4a] mb-1.5">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="0963 xxx xxx"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/40 focus:border-[#0ea5e9] transition-colors text-slate-700 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                Họ tên người liên hệ
              </label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => updateField("contactPerson", e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/40 focus:border-[#0ea5e9] transition-colors text-slate-700 placeholder:text-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                Email hoặc Zalo
              </label>
              <input
                type="text"
                value={form.emailZalo}
                onChange={(e) => updateField("emailZalo", e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/40 focus:border-[#0ea5e9] transition-colors text-slate-700 placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                Sản phẩm chính
              </label>
              <select
                value={form.productType}
                onChange={(e) => updateField("productType", e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/40 focus:border-[#0ea5e9] transition-colors text-slate-700 bg-white"
              >
                <option value="">— Chọn —</option>
                {PRODUCT_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                Số lượng đơn ước tính/tháng
              </label>
              <select
                value={form.estimatedOrders}
                onChange={(e) => updateField("estimatedOrders", e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/40 focus:border-[#0ea5e9] transition-colors text-slate-700 bg-white"
              >
                <option value="">— Chọn —</option>
                {ORDER_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1.5">
              Ghi chú / Yêu cầu khác
            </label>
            <textarea
              value={form.note}
              onChange={(e) => updateField("note", e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/40 focus:border-[#0ea5e9] transition-colors text-slate-700 placeholder:text-slate-300 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={state === "loading"}
            className="w-full py-3.5 text-base font-bold text-white bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-70 disabled:cursor-not-allowed rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-xl flex items-center justify-center gap-2"
          >
            {state === "loading" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang gửi...
              </>
            ) : (
              "Gửi đăng ký"
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
