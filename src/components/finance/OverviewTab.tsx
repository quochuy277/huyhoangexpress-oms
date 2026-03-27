"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { buildBudgetSummary, buildExpenseSummary, buildPnlSections } from "./financeResponsive";

const PERIODS = [
  { value: "month", label: "Tháng này" }, { value: "last_month", label: "Tháng trước" },
  { value: "quarter", label: "Quý này" }, { value: "half", label: "6 tháng" },
  { value: "year", label: "Năm nay" }, { value: "custom", label: "Tùy chọn" },
];
const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"];
const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

interface Props { isAdmin: boolean; initialCategories?: any[]; }

export default function OverviewTab({ isAdmin, initialCategories }: Props) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expForm, setExpForm] = useState({ categoryId: "", title: "", amount: "", date: "", note: "" });
  const [newCat, setNewCat] = useState("");
  const [budgetForm, setBudgetForm] = useState<Record<string, string>>({});

  // P&L Period
  const [pnlPeriod, setPnlPeriod] = useState("month");
  const [pnlCustomFrom, setPnlCustomFrom] = useState("");
  const [pnlCustomTo, setPnlCustomTo] = useState("");

  const getPnlDates = useCallback(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (pnlPeriod === "month") {
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
    } else if (pnlPeriod === "quarter") {
      const qStart = Math.floor(m / 3) * 3;
      return { from: new Date(y, qStart, 1), to: new Date(y, qStart + 3, 0) };
    } else if (pnlPeriod === "year") {
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
    } else if (pnlPeriod === "custom" && pnlCustomFrom && pnlCustomTo) {
      return { from: new Date(pnlCustomFrom), to: new Date(pnlCustomTo) };
    }
    return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
  }, [pnlPeriod, pnlCustomFrom, pnlCustomTo]);

  const fmtDateParam = (d: Date) => d.toISOString().slice(0, 10);

  // React Query: fetch all finance data as a single query
  const pnlDates = getPnlDates();
  const fromStr = fmtDateParam(pnlDates.from);
  const toStr = fmtDateParam(pnlDates.to);
  const budgetMonth = pnlDates.from.toISOString().slice(0, 7);

  const { data: financeData } = useQuery({
    queryKey: ["finance-overview", period, customFrom, customTo, pnlPeriod, pnlCustomFrom, pnlCustomTo],
    queryFn: async () => {
      const [ov, pl, exp, cat, bud] = await Promise.all([
        fetch(`/api/finance/overview?period=${period}${period === "custom" && customFrom && customTo ? `&from=${customFrom}&to=${customTo}` : ""}`).then(r => r.json()),
        fetch(`/api/finance/pnl?from=${fromStr}&to=${toStr}`).then(r => r.json()),
        fetch(`/api/finance/expenses?from=${fromStr}&to=${toStr}`).then(r => r.json()),
        fetch("/api/finance/categories").then(r => r.json()),
        fetch(`/api/finance/budgets?month=${budgetMonth}`).then(r => r.json()),
      ]);
      return { overview: ov, pnl: pl, expenses: exp.expenses || [], categories: cat.categories || [], budgets: bud };
    },
    placeholderData: (prev) => prev,
    initialData: initialCategories ? { overview: null, pnl: null, expenses: [], categories: initialCategories, budgets: null } : undefined,
  });

  const overview = financeData?.overview ?? null;
  const pnl = financeData?.pnl ?? null;
  const expenses = financeData?.expenses ?? [];
  const categories = financeData?.categories ?? initialCategories ?? [];
  const budgets = financeData?.budgets ?? null;

  const refetchAll = () => queryClient.invalidateQueries({ queryKey: ["finance-overview"] });

  const saveExpense = async () => {
    const url = editingExpense ? `/api/finance/expenses/${editingExpense.id}` : "/api/finance/expenses";
    const method = editingExpense ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(expForm) });
    setShowExpenseDialog(false); setEditingExpense(null);
    setExpForm({ categoryId: "", title: "", amount: "", date: "", note: "" });
    refetchAll();
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Xóa khoản chi?")) return;
    await fetch(`/api/finance/expenses/${id}`, { method: "DELETE" });
    refetchAll();
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    await fetch("/api/finance/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCat }) });
    setNewCat(""); refetchAll();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Xóa danh mục?")) return;
    const res = await fetch(`/api/finance/categories/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error); }
    refetchAll();
  };

  const saveBudgets = async () => {
    const budgetArr = Object.entries(budgetForm).map(([categoryId, amount]) => ({ categoryId, amount: parseFloat(amount) || 0 }));
    await fetch("/api/finance/budgets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: getPnlDates().from.toISOString().slice(0, 7), budgets: budgetArr }) });
    setShowBudgetDialog(false); refetchAll();
  };

  const cardStyle = (color: string): React.CSSProperties => ({
    background: "#fff", borderRadius: 12, padding: "18px 20px", borderLeft: `4px solid ${color}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", flex: "1 1 0", minWidth: 200,
  });
  const dlgStyle: React.CSSProperties = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex",
    alignItems: "center", justifyContent: "center", zIndex: 50,
  };
  const dlgInner: React.CSSProperties = {
    background: "#fff", borderRadius: 12, padding: 20, maxWidth: 520, width: "min(92vw, 520px)", border: "1.5px solid #2563eb", maxHeight: "85vh", overflow: "auto",
  };
  const btnPrimary: React.CSSProperties = { background: "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 };
  const btnSec: React.CSSProperties = { background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "8px 16px", borderRadius: 8, cursor: "pointer" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" };

  const s = overview?.summary;
  const pnlSections = pnl ? buildPnlSections(pnl) : [];
  const expenseCards = expenses.map((expense: any) => buildExpenseSummary(expense));
  const budgetCards = budgets?.budgets?.map((budget: any) => buildBudgetSummary(budget)) ?? [];
  const panelClass = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";
  const periodButtonClass = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
      active
        ? "border-blue-200 bg-blue-600 text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
    }`;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => setPeriod(p.value)} className={periodButtonClass(period === p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {period === "custom" && (
        <div className={`${panelClass} grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[auto,1fr,auto,1fr] lg:items-center`}>
          <label className="text-sm font-semibold text-slate-600">Từ</label>
          <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); }} style={inputStyle} />
          <label className="text-sm font-semibold text-slate-600">Đến</label>
          <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); }} style={inputStyle} />
        </div>
      )}

      {s && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div style={cardStyle("#2563eb")}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Tổng Doanh Thu</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#2563eb" }}>{fmtVND(s.grossProfit)}</div>
            <div style={{ fontSize: 11, color: s.revenueChange >= 0 ? "#10b981" : "#ef4444" }}>
              {s.revenueChange >= 0 ? "+" : ""}
              {s.revenueChange}% so với kỳ trước
            </div>
          </div>
          <div style={cardStyle("#ef4444")}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Tổng Chi Phí</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>
              {pnl ? fmtVND(pnl.totalOperatingExpenses - pnl.claims.claimDiff) : "—"}
            </div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Đền bù + Chi phí vận hành</div>
          </div>
          <div style={cardStyle(pnl ? (pnl.netProfit >= 0 ? "#10b981" : "#ef4444") : "#10b981")}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Lợi Nhuận Ròng</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: pnl ? (pnl.netProfit >= 0 ? "#10b981" : "#ef4444") : "#94a3b8" }}>
              {pnl ? fmtVND(pnl.netProfit) : "—"}
            </div>
          </div>
          <div style={cardStyle("#10b981")}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Tổng COD Đã Đối Soát</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981" }}>{fmtVND(s.totalCod)}</div>
          </div>
          <div style={cardStyle("#2563eb")}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Tổng Đơn Đã Đối Soát</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#2563eb" }}>{s.orderCount.toLocaleString()}</div>
          </div>
          <div style={cardStyle("#2563eb")}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Margin Trung Bình</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#2563eb" }}>{s.margin}%</div>
          </div>
        </div>
      )}

      {overview?.trendData?.length > 0 && (
        <div className={panelClass}>
          <h3 className="mb-4 text-base font-bold text-slate-800">📈 Xu hướng Doanh thu</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={overview.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v: any) => `${Math.round(v / 1e6)}M`} />
              <Tooltip formatter={(v: any) => fmtVND(Number(v))} />
              <Area type="monotone" dataKey="profit" stroke="#2563eb" fill="#dbeafe" name="Doanh thu ròng" />
              <Area type="monotone" dataKey="totalCost" stroke="#ef4444" fill="#fee2e2" name="Tổng chi phí" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {overview?.carrierDistribution?.length > 0 && (
          <div className={panelClass}>
            <h3 className="mb-3 text-sm font-bold text-slate-800 sm:text-[15px]">Doanh thu theo Đối tác</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={overview.carrierDistribution} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false}>
                  {overview.carrierDistribution.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtVND(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {overview?.shopDistribution?.length > 0 && (
          <div className={panelClass}>
            <h3 className="mb-3 text-sm font-bold text-slate-800 sm:text-[15px]">Doanh thu theo Cửa hàng</h3>
            <ResponsiveContainer width="100%" height={Math.max(220, overview.shopDistribution.length * 28)}>
              <BarChart data={overview.shopDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} tickFormatter={(v: any) => `${Math.round(v / 1e6)}M`} />
                <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                <Tooltip formatter={(v: any) => fmtVND(Number(v))} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {pnl && (
        <div className={panelClass}>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="text-base font-bold text-slate-800">📊 KẾT QUẢ KINH DOANH — {pnl.month}</h3>
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {[
                  { value: "month", label: "Tháng này" },
                  { value: "quarter", label: "Quý này" },
                  { value: "year", label: "Năm nay" },
                  { value: "custom", label: "Tùy chọn" },
                ].map(p => (
                  <button key={p.value} onClick={() => setPnlPeriod(p.value)} className={periodButtonClass(pnlPeriod === p.value)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {pnlPeriod === "custom" && (
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[auto,1fr,auto,1fr,auto] xl:items-center">
              <label className="text-sm font-semibold text-slate-600">Từ</label>
              <input type="date" value={pnlCustomFrom} onChange={e => setPnlCustomFrom(e.target.value)} style={inputStyle} />
              <label className="text-sm font-semibold text-slate-600">Đến</label>
              <input type="date" value={pnlCustomTo} onChange={e => setPnlCustomTo(e.target.value)} style={inputStyle} />
              <button onClick={refetchAll} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Áp dụng</button>
            </div>
          )}
          <div className="hidden overflow-x-auto md:block">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr><td colSpan={2} style={{ fontWeight: 700, padding: "10px 0 4px", color: "#2563eb", borderBottom: "1px solid #e2e8f0" }}>DOANH THU (tự động từ đơn hàng)</td></tr>
              <tr><td style={{ padding: "6px 16px" }}>Tổng Phí thu từ Shop</td><td style={{ textAlign: "right" }}>{fmtVND(pnl.revenue.totalFeeFromShop)}</td></tr>
              <tr><td style={{ padding: "6px 16px" }}>Trừ Phí NVC (Phí Đối Tác Thu)</td><td style={{ textAlign: "right", color: "#ef4444" }}>-{fmtVND(pnl.revenue.totalCarrierFee)}</td></tr>
              <tr style={{ fontWeight: 700, borderTop: "1px solid #e2e8f0" }}><td style={{ padding: "8px 16px" }}>DOANH THU RÒNG</td><td style={{ textAlign: "right", color: "#2563eb" }}>{fmtVND(pnl.revenue.netRevenue)}</td></tr>

              <tr><td colSpan={2} style={{ fontWeight: 700, padding: "14px 0 4px", color: "#ef4444", borderBottom: "1px solid #e2e8f0" }}>CHI PHÍ TRỰC TIẾP (tự động từ Claims)</td></tr>
              <tr><td style={{ padding: "6px 16px" }}>Đền bù KH</td><td style={{ textAlign: "right", color: "#ef4444" }}>-{fmtVND(pnl.claims.customerComp)}</td></tr>
              <tr><td style={{ padding: "6px 16px" }}>NVC đền bù</td><td style={{ textAlign: "right", color: "#10b981" }}>+{fmtVND(pnl.claims.carrierComp)}</td></tr>
              <tr style={{ fontWeight: 600, borderTop: "1px solid #e2e8f0" }}><td style={{ padding: "8px 16px" }}>Chênh lệch đền bù</td><td style={{ textAlign: "right", color: pnl.claims.claimDiff >= 0 ? "#10b981" : "#ef4444" }}>{fmtVND(pnl.claims.claimDiff)}</td></tr>

              <tr style={{ fontWeight: 700, background: "#f8fafc", borderTop: "2px solid #2563eb" }}><td style={{ padding: "10px 16px" }}>LỢI NHUẬN GỘP</td><td style={{ textAlign: "right", fontSize: 16, color: "#2563eb" }}>{fmtVND(pnl.grossProfit)}</td></tr>

              <tr><td colSpan={2} style={{ fontWeight: 700, padding: "14px 0 4px", color: "#f59e0b", borderBottom: "1px solid #e2e8f0" }}>CHI PHÍ VẬN HÀNH (nhập thủ công)</td></tr>
              {pnl.operatingExpenses?.map((e: any, i: number) => (
                <tr key={i}><td style={{ padding: "6px 16px" }}>{e.name}</td><td style={{ textAlign: "right", color: "#ef4444" }}>-{fmtVND(e.total)}</td></tr>
              ))}
              <tr style={{ fontWeight: 600, borderTop: "1px solid #e2e8f0" }}><td style={{ padding: "8px 16px" }}>TỔNG CHI PHÍ VẬN HÀNH</td><td style={{ textAlign: "right", color: "#ef4444" }}>-{fmtVND(pnl.totalOperatingExpenses)}</td></tr>

              <tr style={{ fontWeight: 700, background: pnl.netProfit >= 0 ? "#f0fdf4" : "#fef2f2", borderTop: "2px solid #1e293b" }}>
                <td style={{ padding: "12px 16px", fontSize: 15 }}>LỢI NHUẬN RÒNG</td>
                <td style={{ textAlign: "right", fontSize: 18, color: pnl.netProfit >= 0 ? "#10b981" : "#ef4444" }}>{fmtVND(pnl.netProfit)} {pnl.netProfit < 0 ? "🔴" : "🟢"}</td>
              </tr>
            </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {pnlSections.map((section) => (
              <details key={section.key} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-800">
                  <span>{section.title}</span>
                  <span className="text-right text-xs font-bold text-slate-600">{section.summary}</span>
                </summary>
                <div className="space-y-2 border-t border-slate-200 bg-white px-4 py-3">
                  {section.rows.map((row) => (
                    <div key={`${section.key}-${row.label}`} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-slate-500">{row.label}</span>
                      <span className="text-right font-semibold text-slate-800">{row.value}</span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      <div className={panelClass}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-bold text-slate-800">📝 Quản Lý Khoản Chi</h3>
          <div className="flex flex-col gap-2 sm:flex-row">
            {isAdmin && <button onClick={() => setShowCatDialog(true)} style={btnSec}>⚙ Quản lý danh mục</button>}
            {isAdmin && <button onClick={() => { setEditingExpense(null); setExpForm({ categoryId: "", title: "", amount: "", date: "", note: "" }); setShowExpenseDialog(true); }} style={btnPrimary}>+ Thêm khoản chi</button>}
          </div>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>#</th>
                <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Ngày</th>
                <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Danh Mục</th>
                <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Tên Khoản Chi</th>
                <th style={{ padding: 10, textAlign: "right", borderBottom: "2px solid #e2e8f0" }}>Số Tiền</th>
                <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Ghi Chú</th>
                {isAdmin && <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Thao Tác</th>}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e: any, i: number) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8 }}>{i + 1}</td>
                  <td style={{ padding: 8 }}>{new Date(e.date).toLocaleDateString("vi-VN")}</td>
                  <td style={{ padding: 8 }}>{e.category?.name}</td>
                  <td style={{ padding: 8 }}>{e.title}</td>
                  <td style={{ padding: 8, textAlign: "right", fontWeight: 600 }}>{fmtVND(e.amount)}</td>
                  <td style={{ padding: 8, color: "#64748b" }}>{e.note || "—"}</td>
                  {isAdmin && (
                    <td style={{ padding: 8, textAlign: "center" }}>
                      <button onClick={() => { setEditingExpense(e); setExpForm({ categoryId: e.categoryId, title: e.title, amount: String(e.amount), date: e.date?.slice(0, 10), note: e.note || "" }); setShowExpenseDialog(true); }} style={{ border: "none", background: "none", cursor: "pointer", marginRight: 8 }}>✏️</button>
                      <button onClick={() => deleteExpense(e.id)} style={{ border: "none", background: "none", cursor: "pointer" }}>🗑</button>
                    </td>
                  )}
                </tr>
              ))}
              {expenses.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Chưa có khoản chi nào</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">
          {expenseCards.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
              Chưa có khoản chi nào
            </div>
          )}
          {expenseCards.map((expense: any, index: number) => {
            const rawExpense = expenses[index];
            return (
              <details key={expense.id} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex list-none items-start justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{expense.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{expense.categoryName} • {expense.dateLabel}</div>
                  </div>
                  <div className="text-right text-sm font-bold text-slate-800">{expense.amountLabel}</div>
                </summary>
                <div className="space-y-3 border-t border-slate-200 bg-white px-4 py-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Ghi chú</span>
                    <span className="text-right text-slate-700">{expense.noteLabel}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingExpense(rawExpense);
                          setExpForm({
                            categoryId: rawExpense.categoryId,
                            title: rawExpense.title,
                            amount: String(rawExpense.amount),
                            date: rawExpense.date?.slice(0, 10),
                            note: rawExpense.note || "",
                          });
                          setShowExpenseDialog(true);
                        }}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => deleteExpense(rawExpense.id)}
                        className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>

      {budgets && (
        <div className={panelClass}>
          {budgets.hasAlert && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#991b1b" }}>
              ⚠️ Có danh mục chi phí đã vượt 90% ngân sách!
            </div>
          )}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-bold text-slate-800">💰 Ngân Sách Hàng Tháng — {budgets.month}</h3>
            {isAdmin && <button onClick={() => { const f: Record<string, string> = {}; budgets.budgets?.forEach((b: any) => { f[b.categoryId] = String(b.budgetAmount || 0); }); setBudgetForm(f); setShowBudgetDialog(true); }} style={btnSec}>⚙ Đặt ngân sách</button>}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Danh Mục</th>
                <th style={{ padding: 10, textAlign: "right", borderBottom: "2px solid #e2e8f0" }}>Ngân Sách</th>
                <th style={{ padding: 10, textAlign: "right", borderBottom: "2px solid #e2e8f0" }}>Đã Chi</th>
                <th style={{ padding: 10, textAlign: "right", borderBottom: "2px solid #e2e8f0" }}>Còn Lại</th>
                <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Tỷ Lệ</th>
                <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {budgets.budgets?.map((b: any) => (
                <tr key={b.categoryId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 8 }}>{b.categoryName}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>{b.budgetAmount > 0 ? fmtVND(b.budgetAmount) : "—"}</td>
                  <td style={{ padding: 8, textAlign: "right", fontWeight: 600 }}>{fmtVND(b.spent)}</td>
                  <td style={{ padding: 8, textAlign: "right", color: b.remaining >= 0 ? "#10b981" : "#ef4444" }}>{b.budgetAmount > 0 ? fmtVND(b.remaining) : "—"}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>
                    {b.budgetAmount > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                        <div style={{ width: 60, height: 6, background: "#e2e8f0", borderRadius: 3 }}>
                          <div style={{ width: `${Math.min(b.ratio, 100)}%`, height: "100%", background: b.ratio > 90 ? "#ef4444" : b.ratio > 70 ? "#f59e0b" : "#10b981", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12 }}>{b.ratio}%</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 8, textAlign: "center" }}>
                    {b.budgetAmount > 0 ? (b.ratio > 90 ? "🔴 Sắp vượt" : b.ratio > 70 ? "🟡 Gần hết" : "🟢 Bình thường") : ""}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {budgetCards.map((budget: any, index: number) => {
              const rawBudget = budgets.budgets[index];
              const toneClass =
                budget.statusTone === "danger"
                  ? "text-red-600"
                  : budget.statusTone === "warning"
                    ? "text-amber-600"
                    : "text-emerald-600";

              return (
                <div key={budget.categoryId} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{budget.categoryName}</div>
                      <div className={`mt-1 text-xs font-semibold ${toneClass}`}>{budget.statusLabel}</div>
                    </div>
                    <div className="text-right text-sm font-bold text-slate-800">{budget.ratioLabel}</div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        budget.statusTone === "danger"
                          ? "bg-red-500"
                          : budget.statusTone === "warning"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(rawBudget.ratio, 100)}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Ngân sách</div>
                      <div className="font-semibold text-slate-800">{budget.budgetLabel}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Đã chi</div>
                      <div className="font-semibold text-slate-800">{budget.spentLabel}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-slate-500">Còn lại</div>
                      <div className={`font-semibold ${rawBudget.remaining >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {budget.remainingLabel}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expense Dialog */}
      {showExpenseDialog && (
        <div style={dlgStyle} onClick={() => setShowExpenseDialog(false)}>
          <div style={dlgInner} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{editingExpense ? "Sửa khoản chi" : "Thêm khoản chi"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={labelStyle}>Danh mục *</label><select value={expForm.categoryId} onChange={e => setExpForm({ ...expForm, categoryId: e.target.value })} style={inputStyle}><option value="">Chọn</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label style={labelStyle}>Tên khoản chi *</label><input value={expForm.title} onChange={e => setExpForm({ ...expForm, title: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Số tiền (VND) *</label><input type="number" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Ngày *</label><input type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Ghi chú</label><input value={expForm.note} onChange={e => setExpForm({ ...expForm, note: e.target.value })} style={inputStyle} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => setShowExpenseDialog(false)} style={btnSec}>Hủy</button>
              <button onClick={saveExpense} style={btnPrimary}>Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Dialog */}
      {showCatDialog && (
        <div style={dlgStyle} onClick={() => setShowCatDialog(false)}>
          <div style={dlgInner} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>⚙ Quản lý danh mục</h3>
            {categories.map((c: any) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span>{c.name} {c.isSystem && <span style={{ fontSize: 10, color: "#94a3b8" }}>(hệ thống)</span>}</span>
                {!c.isSystem && <button onClick={() => deleteCategory(c.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444" }}>🗑</button>}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input placeholder="Tên danh mục mới" value={newCat} onChange={e => setNewCat(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={addCategory} style={btnPrimary}>Thêm</button>
            </div>
            <div style={{ marginTop: 12, textAlign: "right" }}><button onClick={() => setShowCatDialog(false)} style={btnSec}>Đóng</button></div>
          </div>
        </div>
      )}

      {/* Budget Dialog */}
      {showBudgetDialog && (
        <div style={dlgStyle} onClick={() => setShowBudgetDialog(false)}>
          <div style={dlgInner} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>⚙ Đặt ngân sách tháng {budgets?.month}</h3>
            {categories.map((c: any) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <label style={{ flex: 1, fontSize: 13 }}>{c.name}</label>
                <input type="number" value={budgetForm[c.id] || ""} onChange={e => setBudgetForm({ ...budgetForm, [c.id]: e.target.value })} style={{ ...inputStyle, width: 150 }} placeholder="0" />
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => setShowBudgetDialog(false)} style={btnSec}>Hủy</button>
              <button onClick={saveBudgets} style={btnPrimary}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
