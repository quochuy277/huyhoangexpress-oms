// src/components/finance/expenses/ExpensesPageClient.tsx
"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ExpenseSection } from "@/components/finance/ExpenseSection";
import { BudgetSection } from "@/components/finance/BudgetSection";
import { PeriodFilter } from "@/components/finance/shared/PeriodFilter";
import { getDateRange } from "@/lib/finance-period";
import type { FinanceBudgetSummary, FinanceCategoryOption } from "@/lib/finance/landing";

const ExpenseDialog = dynamic(() => import("@/components/finance/ExpenseDialog"), { ssr: false });
const CategoryDialog = dynamic(() => import("@/components/finance/CategoryDialog"), { ssr: false });
const BudgetDialog = dynamic(() => import("@/components/finance/BudgetDialog"), { ssr: false });

type ExpenseItem = { id: string; categoryId: string; title: string; amount: number; date: string; note?: string | null; category?: { name?: string | null } | null };
const EMPTY_FORM = { categoryId: "", title: "", amount: "", date: "", note: "" };

type DialogState = { expense: boolean; category: boolean; budget: boolean };
function dialogReducer(s: DialogState, a: { type: "OPEN" | "CLOSE"; dialog: keyof DialogState }): DialogState {
  return { ...s, [a.dialog]: a.type === "OPEN" };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Lỗi hệ thống");
  return data as T;
}

interface Props {
  isAdmin: boolean;
  initialCategories: FinanceCategoryOption[];
  initialBudgets: FinanceBudgetSummary;
}

export default function ExpensesPageClient({ isAdmin, initialCategories, initialBudgets }: Props) {
  const queryClient = useQueryClient();
  const { confirm, element: confirmDialog } = useConfirmDialog();

  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const range = useMemo(() => getDateRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const fromStr = format(range.from, "yyyy-MM-dd");
  const toStr = format(range.to, "yyyy-MM-dd");
  // Ngân sách theo tháng → bám tháng của đầu kỳ (đúng cho Tháng này/Tháng trước; quý/năm/tùy chọn lấy tháng bắt đầu, có nhãn tháng).
  const monthStr = format(range.from, "yyyy-MM");

  const [dialogs, dispatchDialogs] = useReducer(dialogReducer, { expense: false, category: false, budget: false });
  const [categories, setCategories] = useState<FinanceCategoryOption[]>(initialCategories);
  const [editing, setEditing] = useState<ExpenseItem | null>(null);
  const [expForm, setExpForm] = useState(EMPTY_FORM);
  const [newCat, setNewCat] = useState("");
  const [budgetForm, setBudgetForm] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState("");
  const [fetchEnabled, setFetchEnabled] = useState(false);
  useEffect(() => { const f = requestAnimationFrame(() => setFetchEnabled(true)); return () => cancelAnimationFrame(f); }, []);

  const expensesQuery = useQuery({
    queryKey: ["finance-expenses", fromStr, toStr],
    queryFn: () => fetchJson<{ expenses: ExpenseItem[] }>(`/api/finance/expenses?from=${fromStr}&to=${toStr}`),
    enabled: fetchEnabled,
    placeholderData: (prev) => prev,
  });
  const budgetsQuery = useQuery({
    queryKey: ["finance-budgets", monthStr],
    queryFn: () => fetchJson<FinanceBudgetSummary>(`/api/finance/budgets?month=${monthStr}`),
    initialData: monthStr === format(new Date(), "yyyy-MM") ? initialBudgets : undefined,
  });

  const allExpenses = expensesQuery.data?.expenses ?? [];
  const expenses = categoryFilter ? allExpenses.filter((e) => e.categoryId === categoryFilter) : allExpenses;
  const budgets = budgetsQuery.data ?? initialBudgets;

  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["finance-expenses"] }),
      queryClient.invalidateQueries({ queryKey: ["finance-budgets"] }),
    ]);
  }, [queryClient]);

  const refreshCategories = useCallback(async () => {
    const data = await fetchJson<{ categories: FinanceCategoryOption[] }>("/api/finance/categories");
    setCategories(data.categories || []);
    await refreshAll();
  }, [refreshAll]);

  const saveExpense = useCallback(async () => {
    const url = editing ? `/api/finance/expenses/${editing.id}` : "/api/finance/expenses";
    await fetchJson(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expForm) });
    dispatchDialogs({ type: "CLOSE", dialog: "expense" });
    setEditing(null); setExpForm(EMPTY_FORM);
    await refreshAll();
  }, [editing, expForm, refreshAll]);

  const deleteExpense = useCallback(async (id: string) => {
    const ok = await confirm({ title: "Xóa khoản chi?", description: "Khoản chi sẽ bị xóa vĩnh viễn.", confirmLabel: "Xóa", cancelLabel: "Hủy", tone: "danger", icon: <Trash2 size={26} /> });
    if (!ok) return;
    await fetchJson(`/api/finance/expenses/${id}`, { method: "DELETE" });
    await refreshAll();
  }, [confirm, refreshAll]);

  const addCategory = useCallback(async () => {
    if (!newCat.trim()) return;
    await fetchJson("/api/finance/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCat }) });
    setNewCat(""); await refreshCategories();
  }, [newCat, refreshCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    const ok = await confirm({ title: "Xóa danh mục?", description: "Không thể xóa danh mục đang có khoản chi.", confirmLabel: "Xóa", cancelLabel: "Hủy", tone: "danger", icon: <Trash2 size={26} /> });
    if (!ok) return;
    try { await fetchJson(`/api/finance/categories/${id}`, { method: "DELETE" }); await refreshCategories(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Lỗi hệ thống"); }
  }, [confirm, refreshCategories]);

  const saveBudgets = useCallback(async () => {
    const arr = Object.entries(budgetForm).map(([categoryId, amount]) => ({ categoryId, amount: parseFloat(amount) || 0 }));
    await fetchJson("/api/finance/budgets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: monthStr, budgets: arr }) });
    dispatchDialogs({ type: "CLOSE", dialog: "budget" });
    await refreshAll();
  }, [budgetForm, monthStr, refreshAll]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-3 py-4 sm:px-4 sm:py-5 sm:space-y-6 md:px-6 md:py-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">💸 Chi phí &amp; Ngân sách</h1>
          <p className="mt-1 text-sm text-slate-500">Quản lý khoản chi theo kỳ và ngân sách hằng tháng.</p>
        </div>
        <PeriodFilter
          period={period}
          customFrom={customFrom}
          customTo={customTo}
          onPeriodChange={setPeriod}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold text-slate-600">Lọc danh mục:</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="">Tất cả</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <ExpenseSection
        isAdmin={isAdmin}
        expenses={expenses}
        shouldFetchExpenses={fetchEnabled}
        onOpenCatDialog={() => dispatchDialogs({ type: "OPEN", dialog: "category" })}
        onAddExpense={() => { setEditing(null); setExpForm(EMPTY_FORM); dispatchDialogs({ type: "OPEN", dialog: "expense" }); }}
        onEditExpense={(e) => { setEditing(e); setExpForm({ categoryId: e.categoryId, title: e.title, amount: String(e.amount), date: e.date?.slice(0, 10), note: e.note || "" }); dispatchDialogs({ type: "OPEN", dialog: "expense" }); }}
        onDeleteExpense={deleteExpense}
      />

      <BudgetSection
        isAdmin={isAdmin}
        budgets={budgets}
        onOpenBudgetDialog={() => { const f: Record<string, string> = {}; budgets.budgets?.forEach((b) => { f[b.categoryId] = String(b.budgetAmount || 0); }); setBudgetForm(f); dispatchDialogs({ type: "OPEN", dialog: "budget" }); }}
      />

      {dialogs.expense && <ExpenseDialog isEditing={!!editing} expForm={expForm} categories={categories} onFormChange={setExpForm} onSave={saveExpense} onClose={() => dispatchDialogs({ type: "CLOSE", dialog: "expense" })} />}
      {dialogs.category && <CategoryDialog categories={categories} newCat={newCat} onNewCatChange={setNewCat} onAddCategory={addCategory} onDeleteCategory={deleteCategory} onClose={() => dispatchDialogs({ type: "CLOSE", dialog: "category" })} />}
      {dialogs.budget && <BudgetDialog month={budgets.month} categories={categories} budgetForm={budgetForm} onBudgetFormChange={setBudgetForm} onSave={saveBudgets} onClose={() => dispatchDialogs({ type: "CLOSE", dialog: "budget" })} />}
      {confirmDialog}
    </div>
  );
}
