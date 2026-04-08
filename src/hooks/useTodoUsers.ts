import { useState, useEffect, useRef } from "react";
import type { TodoUser } from "@/types/todo";

let cachedUsers: TodoUser[] | null = null;

export function useTodoUsers(canAssign: boolean, initialUsers?: TodoUser[]) {
  if (initialUsers && initialUsers.length > 0) {
    cachedUsers = initialUsers;
  }

  const [users, setUsers] = useState<TodoUser[]>(initialUsers || cachedUsers || []);
  const [loading, setLoading] = useState(!initialUsers && !cachedUsers && canAssign);
  const fetched = useRef(false);

  useEffect(() => {
    if (!canAssign || fetched.current) return;
    if (initialUsers) {
      fetched.current = true;
      setLoading(false);
      return;
    }
    if (cachedUsers) {
      setUsers(cachedUsers);
      setLoading(false);
      return;
    }
    fetched.current = true;
    setLoading(true);
    fetch("/api/todos/users")
      .then((r) => r.json())
      .then((d) => {
        const list = d.users || [];
        cachedUsers = list;
        setUsers(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canAssign, initialUsers]);

  const invalidate = () => {
    cachedUsers = null;
  };

  return { users, loading, invalidate };
}
