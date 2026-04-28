"use client";

import Image from "next/image";
import { AlertCircle, CheckCircle2, Headphones, Loader2, Phone, Send } from "lucide-react";
import { useState } from "react";

const PRODUCT_OPTIONS = ["Thời trang", "Mỹ phẩm", "Thực phẩm", "Điện tử", "Khác"];
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
    website: "",
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
      setErrorMsg("Số điện thoại không hợp lệ. Vui lòng nhập 10 số và bắt đầu bằng 0.");
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
        setErrorMsg(data.message || "Thông tin đã được ghi nhận trước đó. Chúng tôi sẽ sớm liên hệ bạn.");
        setState("error");
      } else if (res.status === 429) {
        setErrorMsg("Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau vài phút.");
        setState("error");
      } else {
        setErrorMsg(data.error || "Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ hotline 0963 537 634.");
        setState("error");
      }
    } catch {
      setErrorMsg("Không thể kết nối. Vui lòng kiểm tra mạng và thử lại.");
      setState("error");
    }
  };

  return (
    <section id="register" className="bg-[#f8fafc] py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 rounded-3xl bg-white p-6 shadow-2xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-10">
          <div className="relative overflow-hidden rounded-2xl bg-[#123241] p-6 text-white sm:p-8">
            <Image
              src="/images/landing/dashboard-soft-bg.png"
              alt=""
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover opacity-[0.42]"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#123241] via-[#123241]/84 to-[#123241]/48" />

            <div className="relative">
              <span className="text-sm font-extrabold uppercase tracking-[0.18em] text-orange-300">
                Bắt đầu
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-normal sm:text-4xl">
                Bắt đầu gửi hàng cùng Huy Hoàng Express
              </h2>
              <p className="mt-5 text-base leading-8 text-white/72">
                Để lại thông tin, đội ngũ vận hành sẽ liên hệ tư vấn tuyến giao, quy trình COD và
                cách triển khai phù hợp với số lượng đơn của shop.
              </p>

              <div className="mt-8 grid gap-4">
                {[
                  "Tư vấn miễn phí theo mô hình shop",
                  "Không yêu cầu cam kết sản lượng ban đầu",
                  "Có thể thử quy trình trước khi vận hành chính thức",
                ].map((item) => (
                  <div key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    <span className="text-sm font-semibold leading-6 text-white/82">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <a
                  href="tel:0963537634"
                  className="flex items-center gap-3 rounded-xl bg-white/10 p-4 transition hover:bg-white/14"
                >
                  <Phone className="h-5 w-5 text-orange-300" />
                  <div>
                    <p className="text-xs font-semibold text-white/55">Hotline</p>
                    <p className="font-extrabold">0963 537 634</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4">
                  <Headphones className="h-5 w-5 text-sky-200" />
                  <div>
                    <p className="text-xs font-semibold text-white/55">Phản hồi</p>
                    <p className="font-extrabold">Trong 24 giờ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {state === "success" ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 p-8 text-center">
              <div className="rounded-full bg-white p-4 text-emerald-500 shadow-sm">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h3 className="mt-6 text-2xl font-extrabold text-[#123241]">
                Cảm ơn bạn đã đăng ký
              </h3>
              <p className="mt-3 max-w-md text-base leading-7 text-slate-600">
                Huy Hoàng Express đã ghi nhận thông tin và sẽ liên hệ bạn trong 24 giờ.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="absolute h-0 overflow-hidden opacity-0" aria-hidden="true">
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

              {state === "error" && errorMsg && (
                <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Tên shop" required>
                  <input
                    type="text"
                    required
                    value={form.shopName}
                    onChange={(e) => updateField("shopName", e.target.value)}
                    placeholder="Ví dụ: Shop Minh Thư"
                    className="landing-input"
                  />
                </Field>
                <Field label="Số điện thoại" required>
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="0963 xxx xxx"
                    className="landing-input"
                  />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Người liên hệ">
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) => updateField("contactPerson", e.target.value)}
                    className="landing-input"
                  />
                </Field>
                <Field label="Email hoặc Zalo">
                  <input
                    type="text"
                    value={form.emailZalo}
                    onChange={(e) => updateField("emailZalo", e.target.value)}
                    className="landing-input"
                  />
                </Field>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Sản phẩm chính">
                  <select
                    value={form.productType}
                    onChange={(e) => updateField("productType", e.target.value)}
                    className="landing-input bg-white"
                  >
                    <option value="">Chọn ngành hàng</option>
                    {PRODUCT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Số đơn/tháng">
                  <select
                    value={form.estimatedOrders}
                    onChange={(e) => updateField("estimatedOrders", e.target.value)}
                    className="landing-input bg-white"
                  >
                    <option value="">Chọn sản lượng</option>
                    {ORDER_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Ghi chú">
                <textarea
                  value={form.note}
                  onChange={(e) => updateField("note", e.target.value)}
                  rows={4}
                  placeholder="Nhu cầu giao hàng, khu vực thường gửi, vấn đề COD hoặc hoàn hàng..."
                  className="landing-input resize-none"
                />
              </Field>

              <button
                type="submit"
                disabled={state === "loading"}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#f97316] px-6 text-base font-extrabold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {state === "loading" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    Gửi đăng ký
                    <Send className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-[#123241]">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
