import { getCachedSession } from "@/lib/cached-session";
import { hasPermission } from "@/lib/route-permissions";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import { getTodosBootstrapData } from "@/lib/todo-page-data";

const TodosClient = dynamic(() => import("@/components/todos/TodosClient"));

export default async function TodosPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const initialData = await getTodosBootstrapData({
    id: user.id,
    role: user.role || "STAFF",
    permissions: user.permissions,
  });

  const canViewAllTodos = hasPermission(user, "canViewAllTodos");

  return (
    <TodosClient
      userId={user.id}
      userName={user.name || "User"}
      userRole={user.role || "STAFF"}
      canViewAllTodos={canViewAllTodos}
      initialData={initialData}
    />
  );
}
