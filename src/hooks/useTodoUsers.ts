import { useState, useEffect, useRef } from "react";
import type { TodoUser } from "@/types/todo";

let cachedUsers: TodoUser[] | null = null;

function readCachedUsers() {
  return cachedUsers;
}

function writeCachedUsers(users: TodoUser[]) {
  cachedUsers = [...users];
}

function clearCachedUsers() {
  cachedUsers = null;
}

export function useTodoUsers(canAssign: boolean, initialUsers?: TodoUser[]) {
  const hasInitialUsers = initialUsers !== undefined;
  const initialCachedUsers = hasInitialUsers ? null : readCachedUsers();
  const [users, setUsers] = useState<TodoUser[]>(initialCachedUsers || []);
  const [loading, setLoading] = useState(!hasInitialUsers && !initialCachedUsers && canAssign);
  const fetched = useRef(Boolean(initialCachedUsers));

  useEffect(() => {
    if (hasInitialUsers) {
      writeCachedUsers(initialUsers ?? []);
      fetched.current = true;
      return;
    }
    if (!canAssign || fetched.current) return;
    fetched.current = true;
    fetch("/api/todos/users")
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.users) ? d.users : [];
        writeCachedUsers(list);
        setUsers(list);
      })
      .catch((err) => { console.warn("[useTodoUsers] Failed to fetch users:", err); })
      .finally(() => setLoading(false));
  }, [canAssign, hasInitialUsers, initialUsers]);

  const invalidate = () => {
    clearCachedUsers();
    fetched.current = false;
  };

  return {
    users: hasInitialUsers ? (initialUsers ?? []) : users,
    loading: hasInitialUsers ? false : loading,
    invalidate,
  };
}
