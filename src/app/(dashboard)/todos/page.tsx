import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const TodosClient = dynamic(() => import("@/components/todos/TodosClient"));

export default async function TodosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;

  return (
    <TodosClient
      userId={user.id}
      userName={user.name || "User"}
      userRole={user.role || "STAFF"}
    />
  );
}
