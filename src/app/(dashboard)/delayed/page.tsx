import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { DelayedClient } from "@/components/delayed/DelayedClient";

export const metadata: Metadata = {
  title: "Cham Soc Don Hoan",
};

export default async function DelayedOrdersPage() {
  const session = await auth();
  const userRole = session?.user?.role || "VIEWER";

  return <DelayedClient userRole={userRole} />;
}
