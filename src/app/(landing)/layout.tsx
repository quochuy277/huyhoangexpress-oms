import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Huy Hoàng Express - Giải pháp gửi hàng và đối soát COD cho shop online",
  description:
    "Kết nối nhiều nhà vận chuyển, quản lý đơn hàng, theo dõi vận chuyển và đối soát COD rõ ràng cho shop online.",
  openGraph: {
    title: "Huy Hoàng Express - Giải pháp gửi hàng và đối soát COD cho shop online",
    description:
      "Một đầu mối để tạo đơn, theo dõi vận chuyển, xử lý hoàn hàng và đối soát COD rõ ràng.",
    type: "website",
    locale: "vi_VN",
    siteName: "Huy Hoàng Express",
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
