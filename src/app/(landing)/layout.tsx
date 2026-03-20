import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Huy Hoàng Express — Giải pháp gửi hàng tối ưu cho shop online",
  description:
    "Gửi hàng 63 tỉnh thành với 5 NVC hàng đầu. Tiết kiệm chi phí, quản lý đơn hàng dễ dàng. Đăng ký miễn phí ngay!",
  openGraph: {
    title: "Huy Hoàng Express — Giải pháp gửi hàng tối ưu cho shop online",
    description:
      "Gửi hàng 63 tỉnh thành với 5 NVC hàng đầu. Tiết kiệm chi phí, quản lý đơn hàng dễ dàng. Đăng ký miễn phí ngay!",
    type: "website",
    locale: "vi_VN",
    siteName: "Huy Hoàng Express",
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
