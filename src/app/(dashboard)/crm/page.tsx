import { auth } from "@/lib/auth";
import { CrmClient } from "@/components/crm/CrmClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Quản Lý Khách Hàng | Care Đơn" };

export default async function CrmPage() {
  const session = await auth();
  const userRole = session?.user?.role || "VIEWER";
  const userId = session?.user?.id || "";
  const userName = session?.user?.name || "";

  return (
    <CrmClient
      userRole={userRole}
      userId={userId}
      userName={userName}
    />
  );
}
