import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";

// Server-side guard for all /admin routes. Defense-in-depth on top of
// the proxy-level check — if the proxy is ever bypassed, this layout
// still blocks rendering for users without canManageUsers.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");

  if (!hasPermission(session.user, "canManageUsers")) {
    redirect("/no-access");
  }

  return <>{children}</>;
}
