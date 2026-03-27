import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FinancePageClient from "@/components/finance/FinancePageClient";

export default async function FinancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { role, permissions } = session.user;
  if (!permissions?.canViewFinancePage && role !== "ADMIN") redirect("/");

  const isAdmin = role === "ADMIN";

  // Pre-fetch categories on server (slow-changing data, saves 1 client request)
  const categories = await prisma.expenseCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { expenses: true } } },
  });

  return <FinancePageClient isAdmin={isAdmin} initialCategories={categories} />;
}
