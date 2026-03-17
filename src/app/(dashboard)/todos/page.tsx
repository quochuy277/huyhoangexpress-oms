import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TodosClient from "@/components/todos/TodosClient";

export default async function TodosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  return (
    <TodosClient
      userId={user.id}
      userName={user.name || "User"}
      userRole={user.role || "STAFF"}
    />
  );
}
