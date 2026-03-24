import type { TodoStatus, Priority } from "@prisma/client";

export type { TodoStatus, Priority };

export type TodoSource = "MANUAL" | "FROM_DELAYED" | "FROM_RETURNS" | "FROM_CLAIMS" | "FROM_ORDERS" | "FROM_CRM";

export interface TodoAssignee {
  id: string;
  name: string;
}

export interface TodoLinkedOrder {
  id: string;
  requestCode: string;
  shopName: string | null;
  status: string;
  codAmount: number | null;
}

export interface TodoComment {
  id: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: string;
}

export interface TodoItemData {
  id: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: Priority;
  dueDate: string | null;
  sortOrder: number;
  source: TodoSource;
  assigneeId: string | null;
  assignee: TodoAssignee | null;
  createdBy: TodoAssignee | null;
  createdById: string;
  linkedOrderId: string | null;
  linkedOrder: TodoLinkedOrder | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number };
  comments?: TodoComment[];
}

export interface TodoPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TodoStats {
  today: number;
  overdue: number;
  inProgress: number;
  doneWeek: number;
}

export interface TodoStatsResponse {
  mine: TodoStats;
  all: TodoStats;
}

export interface TodoReminder {
  overdue: { count: number; items: { id: string; title: string; daysOverdue: number }[] };
  dueToday: { count: number; items: { id: string; title: string }[] };
}

export interface TodoUser {
  id: string;
  name: string;
  role: string;
}

export interface TodoFilters {
  search: string;
  source: string;
  priority: string;
  dueFilter: string;
}
