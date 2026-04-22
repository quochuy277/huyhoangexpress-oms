"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FinanceBudgetSummary, FinanceCategoryOption, FinanceLandingData, FinancePnlData } from "@/lib/finance/landing";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { ExpenseSection } from "./ExpenseSection";
import { BudgetSection } from "./BudgetSection";
import { PnLSection } from "./PnLSection";
import { OverviewPeriodSelector } from "./OverviewPeriodSelector";
import { OverviewSummaryCards } from "./OverviewSummaryCards";
import { OverviewCharts } from "./OverviewCharts";

// Lazy-load dialogs (only loaded when opened)
const ExpenseDialog = dynamic(() => import("./ExpenseDialog"), { ssr: false });
const CategoryDialog = dynamic(() => import("./CategoryDialog"), { ssr: false });
const BudgetDialog = dynamic(() => import("./BudgetDialog"), { ssr: false });

const INITIAL_DATA_UPDATED_AT = Date.now();
const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

type ExpenseItem = {
  id: string;
  categoryId: string;
  title: string;
  amount: number;
  date: string;
  note?: string | null;
  category?: { name?: string | null } | null;
};

interface Props {
  isAdmin: boolean;
  initialLandingData?: FinanceLandingData | null;
  initialCategories?: FinanceCategoryOption[];
}

// --- Grouped state: dialogs ---
type DialogState = {
  expense: boolean;
  category: boolean;
  budget: boolean;
};
type DialogAction =
  | { type: "OPEN"; dialog: keyof DialogState }
  | { type: "CLOSE"; dialog: keyof DialogState }
  | { type: "CLOSE_ALL" };

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "OPEN":
      return { ...state, [action.dialog]: true };
    case "CLOSE":
      return { ...state, [action.dialog]: false };
    case "CLOSE_ALL":
      return { expense: false, category: false, budget: false };
    default:
      return state;
  }
}

// --- Grouped state: P&L period filter ---
type PnlFilterState = {
  period: string;
  customFromInput: string;
  customToInput: string;
  customFrom: string;
  customTo: string;
};
type PnlFilterAction =
  | { type: "SET_PERIOD"; period: string }
  | { type: "SET_CUSTOM_FROM_INPUT"; value: string }
  | { type: "SET_CUSTOM_TO_INPUT"; value: string }
  | { type: "APPLY_CUSTOM" };

function pnlFilterReducer(state: PnlFilterState, action: PnlFilterAction): PnlFilterState {
  switch (action.type) {
    case "SET_PERIOD":
      return { ...state, period: action.period };
    case "SET_CUSTOM_FROM_INPUT":
      return { ...state, customFromInput: action.value };
    case "SET_CUSTOM_TO_INPUT":
      return { ...state, customToInput: action.value };
    case "APPLY_CUSTOM":
      return { ...state, customFrom: state.customFromInput, customTo: state.customToInput };
    default:
      return state;
  }
}

// --- Expense form state ---
const EMPTY_EXP_FORM = { categoryId: "", title: "", amount: "", date: "", note: "" };

// --- Helpers ---
function buildOverviewSearch(period: string, from: string, to: string) {
  const params = new URLSearchParams({ period });
  if (period === "custom" && from && to) {
    params.set("from", from);
    params.set("to", to);
  }
  return params.toString();
}

function buildPnlDateRange(period: string, from: string, to: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (period === "quarter") {
    const quarterStart = Math.floor(month / 3) * 3;
    return { from: new Date(year, quarterStart, 1), to: new Date(year, quarterStart + 3, 0) };
  }
  if (period === "year") {
    return { from: new Date(year, 0, 1), to: new Date(year, 11, 31) };
  }
  if (period === "custom" && from && to) {
    return { from: new Date(from), to: new Date(to) };
  }
  return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0) };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Lỗi hệ thống");
  return data as T;
}

export default function OverviewTab({ isAdmin, initialLandingData, initialCategories }: Props) {
  const queryClient = useQueryClient();
  const { confirm, element: confirmDialog } = useConfirmDialog();

  // --- Filter state ---
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // --- Dialog state (grouped) ---
  const [dialogs, dispatchDialogs] = useReducer(dialogReducer, {
    expense: false,
    category: false,
    budget: false,
  });

  // --- P&L filter state (grouped) ---
  const [pnlFilter, dispatchPnlFilter] = useReducer(pnlFilterReducer, {
    period: "month",
    customFromInput: "",
    customToInput: "",
    customFrom: "",
    customTo: "",
  });

  // --- Expense form state (grouped) ---
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [expForm, setExpForm] = useState(EMPTY_EXP_FORM);

  // --- Category form ---
  const [newCat, setNewCat] = useState("");
  const [budgetForm, setBudgetForm] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<FinanceCategoryOption[]>(
    initialCategories ?? initialLandingData?.categories ?? []
  );

  const [shouldFetchExpenses, setShouldFetchExpenses] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setShouldFetchExpenses(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // --- Memoized derived values ---
  const fmtDateParam = (d: Date) => format(d, "yyyy-MM-dd");
  const overviewSearch = useMemo(
    () => buildOverviewSearch(period, customFrom, customTo),
    [period, customFrom, customTo]
  );
  const pnlDates = useMemo(
    () => buildPnlDateRange(pnlFilter.period, pnlFilter.customFrom, pnlFilter.customTo),
    [pnlFilter.period, pnlFilter.customFrom, pnlFilter.customTo]
  );
  const fromStr = fmtDateParam(pnlDates.from);
  const toStr = fmtDateParam(pnlDates.to);
  const budgetMonth = format(pnlDates.from, "yyyy-MM");

  // --- Queries ---
  const landingQuery = useQuery({
    queryKey: ["finance-landing", overviewSearch],
    queryFn: () => fetchJson<FinanceLandingData>(`/api/finance/landing?${overviewSearch}`),
    initialData: initialLandingData ?? undefined,
    initialDataUpdatedAt: initialLandingData ? INITIAL_DATA_UPDATED_AT : undefined,
    placeholderData: (prev) => prev,
  });

  const pnlQuery = useQuery({
    queryKey: ["finance-pnl", fromStr, toStr],
    queryFn: () => fetchJson<FinancePnlData>(`/api/finance/pnl?from=${fromStr}&to=${toStr}`),
    initialData:
      initialLandingData && pnlFilter.period === "month" && !pnlFilter.customFrom && !pnlFilter.customTo
        ? initialLandingData.pnl
        : undefined,
    initialDataUpdatedAt: initialLandingData ? INITIAL_DATA_UPDATED_AT : undefined,
    placeholderData: (prev) => prev,
  });

  const budgetsQuery = useQuery({
    queryKey: ["finance-budgets", budgetMonth],
    queryFn: () => fetchJson<FinanceBudgetSummary>(`/api/finance/budgets?month=${budgetMonth}`),
    initialData:
      initialLandingData && budgetMonth === initialLandingData.budgets.month
        ? initialLandingData.budgets
        : undefined,
    initialDataUpdatedAt: initialLandingData ? INITIAL_DATA_UPDATED_AT : undefined,
    placeholderData: (prev) => prev,
  });

  const expensesQuery = useQuery({
    queryKey: ["finance-expenses", fromStr, toStr],
    queryFn: () => fetchJson<{ expenses: ExpenseItem[] }>(`/api/finance/expenses?from=${fromStr}&to=${toStr}`),
    enabled: shouldFetchExpenses,
    placeholderData: (prev) => prev,
  });

  const overview = landingQuery.data ?? null;
  const pnl = pnlQuery.data ?? initialLandingData?.pnl ?? null;
  const expenses = expensesQuery.data?.expenses ?? [];
  const budgets = budgetsQuery.data ?? initialLandingData?.budgets ?? null;

  // --- Memoized chart data ---
  const trendData = useMemo(() => overview?.trendData ?? [], [overview?.trendData]);
  const carrierDistribution = useMemo(() => overview?.carrierDistribution ?? [], [overview?.carrierDistribution]);
  const shopDistribution = useMemo(() => overview?.shopDistribution ?? [], [overview?.shopDistribution]);
  const shopBarHeight = useMemo(
    () => Math.max(220, shopDistribution.length * 28),
    [shopDistribution.length]
  );

  // --- Summary cards data ---
  const summaryCards = useMemo(() => {
    const s = overview?.summary;
    if (!s) return null;
    return { s };
  }, [overview?.summary]);

  // --- Refresh callbacks ---
  const refreshLanding = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["finance-landing"] }),
    [queryClient]
  );
  const refreshExpenses = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["finance-expenses"] }),
    [queryClient]
  );
  const refreshPnl = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["finance-pnl"] }),
    [queryClient]
  );
  const refreshBudgets = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["finance-budgets"] }),
    [queryClient]
  );

  const refreshAfterExpenseChange = useCallback(async () => {
    await Promise.all([refreshLanding(), refreshExpenses(), refreshPnl(), refreshBudgets()]);
  }, [refreshLanding, refreshExpenses, refreshPnl, refreshBudgets]);

  const refreshCategories = useCallback(async () => {
    const data = await fetchJson<{ categories: FinanceCategoryOption[] }>("/api/finance/categories");
    setCategories(data.categories || []);
    await Promise.all([refreshLanding(), refreshPnl(), refreshBudgets()]);
  }, [refreshLanding, refreshPnl, refreshBudgets]);

  // --- Action callbacks ---
  const saveExpense = useCallback(async () => {
    const url = editingExpense ? `/api/finance/expenses/${editingExpense.id}` : "/api/finance/expenses";
    const method = editingExpense ? "PUT" : "POST";
    await fetchJson(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(expForm),
    });
    dispatchDialogs({ type: "CLOSE", dialog: "expense" });
    setEditingExpense(null);
    setExpForm(EMPTY_EXP_FORM);
    await refreshAfterExpenseChange();
  }, [editingExpense, expForm, refreshAfterExpenseChange]);

  const deleteExpense = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: "Xóa khoản chi?",
        description: "Khoản chi này sẽ bị xóa vĩnh viễn và không thể khôi phục.",
        confirmLabel: "Xóa",
        cancelLabel: "Hủy",
        tone: "danger",
        icon: <Trash2 size={26} />,
      });
      if (!ok) return;
      await fetchJson(`/api/finance/expenses/${id}`, { method: "DELETE" });
      await refreshAfterExpenseChange();
    },
    [confirm, refreshAfterExpenseChange]
  );

  const addCategory = useCallback(async () => {
    if (!newCat.trim()) return;
    await fetchJson("/api/finance/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCat }),
    });
    setNewCat("");
    await refreshCategories();
  }, [newCat, refreshCategories]);

  const deleteCategory = useCallback(
    async (id: string) => {
      const ok = await confirm({
        title: "Xóa danh mục?",
        description: "Danh mục sẽ bị xóa khỏi danh sách. Bạn không thể xóa danh mục đang có khoản chi.",
        confirmLabel: "Xóa",
        cancelLabel: "Hủy",
        tone: "danger",
        icon: <Trash2 size={26} />,
      });
      if (!ok) return;
      try {
        await fetchJson(`/api/finance/categories/${id}`, { method: "DELETE" });
        await refreshCategories();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Lỗi hệ thống");
      }
    },
    [confirm, refreshCategories]
  );

  const saveBudgets = useCallback(async () => {
    const budgetArr = Object.entries(budgetForm).map(([categoryId, amount]) => ({
      categoryId,
      amount: parseFloat(amount) || 0,
    }));
    await fetchJson("/api/finance/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: budgetMonth, budgets: budgetArr }),
    });
    dispatchDialogs({ type: "CLOSE", dialog: "budget" });
    await Promise.all([refreshBudgets(), refreshLanding()]);
  }, [budgetForm, budgetMonth, refreshBudgets, refreshLanding]);

  // --- Expense section callbacks ---
  const handleOpenCatDialog = useCallback(() => {
    dispatchDialogs({ type: "OPEN", dialog: "category" });
  }, []);

  const handleAddExpense = useCallback(() => {
    setEditingExpense(null);
    setExpForm(EMPTY_EXP_FORM);
    dispatchDialogs({ type: "OPEN", dialog: "expense" });
  }, []);

  const handleEditExpense = useCallback((e: ExpenseItem) => {
    setEditingExpense(e);
    setExpForm({
      categoryId: e.categoryId,
      title: e.title,
      amount: String(e.amount),
      date: e.date?.slice(0, 10),
      note: e.note || "",
    });
    dispatchDialogs({ type: "OPEN", dialog: "expense" });
  }, []);

  const handleOpenBudgetDialog = useCallback(() => {
    const f: Record<string, string> = {};
    budgets?.budgets?.forEach((b: any) => {
      f[b.categoryId] = String(b.budgetAmount || 0);
    });
    setBudgetForm(f);
    dispatchDialogs({ type: "OPEN", dialog: "budget" });
  }, [budgets]);

  // --- P&L section callbacks ---
  const handlePnlPeriodChange = useCallback((period: string) => {
    dispatchPnlFilter({ type: "SET_PERIOD", period });
  }, []);
  const handlePnlCustomFromInputChange = useCallback((value: string) => {
    dispatchPnlFilter({ type: "SET_CUSTOM_FROM_INPUT", value });
  }, []);
  const handlePnlCustomToInputChange = useCallback((value: string) => {
    dispatchPnlFilter({ type: "SET_CUSTOM_TO_INPUT", value });
  }, []);
  const handleApplyPnlCustomRange = useCallback(() => {
    dispatchPnlFilter({ type: "APPLY_CUSTOM" });
  }, []);

  const s = summaryCards?.s;

  return (
    <div className="space-y-5 sm:space-y-6">
      <OverviewPeriodSelector
        period={period}
        customFrom={customFrom}
        customTo={customTo}
        onPeriodChange={setPeriod}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
      />

      {s && (
        <OverviewSummaryCards summary={s} pnl={pnl} formatCurrency={fmtVND} />
      )}

      <OverviewCharts
        trendData={trendData}
        carrierDistribution={carrierDistribution}
        shopDistribution={shopDistribution}
        shopBarHeight={shopBarHeight}
        formatCurrency={fmtVND}
      />

      {/* P&L Section */}
      {pnl && (
        <PnLSection
          pnl={pnl}
          pnlPeriod={pnlFilter.period}
          pnlCustomFromInput={pnlFilter.customFromInput}
          pnlCustomToInput={pnlFilter.customToInput}
          onPnlPeriodChange={handlePnlPeriodChange}
          onPnlCustomFromInputChange={handlePnlCustomFromInputChange}
          onPnlCustomToInputChange={handlePnlCustomToInputChange}
          onApplyPnlCustomRange={handleApplyPnlCustomRange}
        />
      )}

      {/* Expense Section */}
      <ExpenseSection
        isAdmin={isAdmin}
        expenses={expenses}
        shouldFetchExpenses={shouldFetchExpenses}
        onOpenCatDialog={handleOpenCatDialog}
        onAddExpense={handleAddExpense}
        onEditExpense={handleEditExpense}
        onDeleteExpense={deleteExpense}
      />

      {/* Budget Section */}
      {budgets && (
        <BudgetSection
          isAdmin={isAdmin}
          budgets={budgets}
          onOpenBudgetDialog={handleOpenBudgetDialog}
        />
      )}

      {/* Lazy-loaded Dialogs */}
      {dialogs.expense && (
        <ExpenseDialog
          isEditing={!!editingExpense}
          expForm={expForm}
          categories={categories}
          onFormChange={setExpForm}
          onSave={saveExpense}
          onClose={() => dispatchDialogs({ type: "CLOSE", dialog: "expense" })}
        />
      )}

      {dialogs.category && (
        <CategoryDialog
          categories={categories}
          newCat={newCat}
          onNewCatChange={setNewCat}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          onClose={() => dispatchDialogs({ type: "CLOSE", dialog: "category" })}
        />
      )}

      {dialogs.budget && (
        <BudgetDialog
          month={budgets?.month ?? ""}
          categories={categories}
          budgetForm={budgetForm}
          onBudgetFormChange={setBudgetForm}
          onSave={saveBudgets}
          onClose={() => dispatchDialogs({ type: "CLOSE", dialog: "budget" })}
        />
      )}

      {confirmDialog}
    </div>
  );
}
