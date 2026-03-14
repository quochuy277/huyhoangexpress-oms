import { auth } from "@/lib/auth";
import { OrdersClient } from "@/components/orders/OrdersClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Quản Lý Đơn Hàng" };

export default async function OrdersPage() {
  const session = await auth();
  const userRole = session?.user?.role || "VIEWER";

  return <OrdersClient userRole={userRole} />;
}
