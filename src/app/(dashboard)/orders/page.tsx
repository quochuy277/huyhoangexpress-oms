import { auth } from "@/lib/auth";
import { OrdersClient } from "@/components/orders/OrdersClient";
import { getOrdersList } from "@/lib/orders-list";
import { ordersQuerySchema } from "@/lib/validations";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { OrdersApiResponse } from "@/types/orders";

export const metadata: Metadata = { title: "Quản Lý Đơn Hàng" };

interface OrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRole = session?.user?.role || "VIEWER";
  const permissions = session.user.permissions;
  if (!permissions?.canViewOrders && userRole !== "ADMIN") {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const rawParams = Object.entries(resolvedSearchParams).reduce<Record<string, string>>(
    (accumulator, [key, value]) => {
      if (typeof value === "string") {
        accumulator[key] = value;
      }

      return accumulator;
    },
    {},
  );
  const parsed = ordersQuerySchema.safeParse(rawParams);
  const ordersParams = parsed.success ? parsed.data : ordersQuerySchema.parse({});
  const activeTab = rawParams.tab === "changes" ? "changes" : "orders";

  let initialOrdersData: OrdersApiResponse | null = null;

  if (activeTab === "orders") {
    initialOrdersData = JSON.parse(
      JSON.stringify(await getOrdersList(ordersParams)),
    ) as OrdersApiResponse;
  }

  return (
    <OrdersClient
      userRole={userRole}
      initialOrdersData={initialOrdersData}
    />
  );
}
