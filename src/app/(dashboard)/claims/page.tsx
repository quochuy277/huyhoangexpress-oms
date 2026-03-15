import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ClaimsClient from "@/components/claims/ClaimsClient";

export default async function ClaimsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <ClaimsClient />;
}
