import { useState, useEffect, useRef } from "react";
import type { TodoUser } from "@/types/todo";

let cachedUsers: TodoUser[] | null = null;

export function useTodoUsers(canAssign: boolean) {
  const [users, setUsers] = useState<TodoUser[]>(cachedUsers || []);
  const [loading, setLoading] = useState(!cachedUsers && canAssign);
  const fetched = useRef(false);

  useEffect(() => {
    if (!canAssign || fetched.current) return;
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
  }, [canAssign]);

  const invalidate = () => {
    cachedUsers = null;
  };

  return { users, loading, invalidate };
}
