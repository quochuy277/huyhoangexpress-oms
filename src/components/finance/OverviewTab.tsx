"use client";

import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";

const PERIODS = [
  { value: "month", label: "Tháng này" }, { value: "last_month", label: "Tháng trước" },
  { value: "quarter", label: "Quý này" }, { value: "half", label: "6 tháng" },
  { value: "year", label: "Năm nay" },
];
const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"];
const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

interface Props { isAdmin: boolean; }

export default function OverviewTab({ isAdmin }: Props) {
  const [period, setPeriod] = useState("month");
  const [overview, setOverview] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any>(null);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showCatDialog, setShowCatDialog] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expForm, setExpForm] = useState({ categoryId: "", title: "", amount: "", date: "", note: "" });
  const [newCat, setNewCat] = useState("");
  const [budgetForm, setBudgetForm] = useState<Record<string, string>>({});
  const curMonth = new Date().toISOString().slice(0, 7);

  const fetchAll = useCallback(async () => {
    const [ov, pl, exp, cat, bud] = await Promise.all([
      fetch(`/api/finance/overview?period=${period}`).then(r => r.json()),
      fetch(`/api/finance/pnl?month=${curMonth}`).then(r => r.json()),
      fetch(`/api/finance/expenses?month=${curMonth}`).then(r => r.json()),
      fetch("/api/finance/categories").then(r => r.json()),
      fetch(`/api/finance/budgets?month=${curMonth}`).then(r => r.json()),
    ]);
    setOverview(ov); setPnl(pl); setExpenses(exp.expenses || []); setCategories(cat.categories || []); setBudgets(bud);
  }, [period, curMonth]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveExpense = async () => {
    const url = editingExpense ? `/api/finance/expenses/${editingExpense.id}` : "/api/finance/expenses";
    const method = editingExpense ? "PUT" : "POST";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(expForm) });
    setShowExpenseDialog(false); setEditingExpense(null);
    setExpForm({ categoryId: "", title: "", amount: "", date: "", note: "" });
    fetchAll();
  };

  const deleteExpense = async (id: string) => {
    if (!confirm("Xóa khoản chi?")) return;
    await fetch(`/api/finance/expenses/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    await fetch("/api/finance/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCat }) });
    setNewCat(""); fetchAll();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Xóa danh mục?")) return;
    const res = await fetch(`/api/finance/categories/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error); }
    fetchAll();
  };

  const saveBudgets = async () => {
    const budgetArr = Object.entries(budgetForm).map(([categoryId, amount]) => ({ categoryId, amount: parseFloat(amount) || 0 }));
    await fetch("/api/finance/budgets", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: curMonth, budgets: budgetArr }) });
    setShowBudgetDialog(false); fetchAll();
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
    background: "#fff", borderRadius: 12, padding: 24, maxWidth: 500, width: "90%", border: "1.5px solid #2563eb", maxHeight: "80vh", overflow: "auto",
  };
  const btnPrimary: React.CSSProperties = { background: "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600 };
  const btnSec: React.CSSProperties = { background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "8px 16px", borderRadius: 8, cursor: "pointer" };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14 };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" };

  const s = overview?.summary;

  return (
    <div>
      {/* Period Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)} style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer",
            background: period === p.value ? "#2563eb" : "#fff", color: period === p.value ? "#fff" : "#64748b",
            fontWeight: 600, fontSize: 13, transition: "all 0.2s",
          }}>{p.label}</button>
        ))}
      </div>

      {/* Section A: Summary Cards */}
      {s && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={cardStyle("#2563eb")}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Tổng Doanh Thu</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#2563eb" }}>{fmtVND(s.grossProfit)}</div>
              <div style={{ fontSize: 11, color: s.revenueChange >= 0 ? "#10b981" : "#ef4444" }}>{s.revenueChange >= 0 ? "+" : ""}{s.revenueChange}% so với kỳ trước</div>
            </div>
            <div style={cardStyle("#ef4444")}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Tổng Chi Phí</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{pnl ? fmtVND(pnl.totalOperatingExpenses - pnl.claims.claimDiff) : "—"}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Đền bù + Chi phí vận hành</div>
            </div>
            <div style={cardStyle(pnl ? (pnl.netProfit >= 0 ? "#10b981" : "#ef4444") : "#10b981")}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Lợi Nhuận Ròng</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: pnl ? (pnl.netProfit >= 0 ? "#10b981" : "#ef4444") : "#94a3b8" }}>{pnl ? fmtVND(pnl.netProfit) : "—"}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
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
        </>
      )}

      {/* Section B: Trend Chart */}
      {overview?.trendData?.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📈 Xu hướng Doanh thu</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={overview.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v: any) => `${Math.round(v / 1e6)}M`} />
              <Tooltip formatter={(v: any) => fmtVND(Number(v))} />
              <Area type="monotone" dataKey="profit" stroke="#2563eb" fill="#dbeafe" name="Doanh thu ròng" />
              <Area type="monotone" dataKey="totalCost" stroke="#ef4444" fill="#fee2e2" name="Tổng chi phí" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Section C: Distribution Charts */}
      <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
        {overview?.carrierDistribution?.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, flex: "1 1 350px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Doanh thu theo Đối tác</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={overview.carrierDistribution} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {overview.carrierDistribution.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtVND(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {overview?.shopDistribution?.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 20, flex: "1 1 350px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Doanh thu theo Cửa hàng</h3>
            <ResponsiveContainer width="100%" height={Math.max(220, overview.shopDistribution.length * 30)}>
              <BarChart data={overview.shopDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} tickFormatter={(v: any) => `${Math.round(v / 1e6)}M`} />
                <YAxis type="category" dataKey="name" fontSize={11} width={150} />
                <Tooltip formatter={(v: any) => fmtVND(Number(v))} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Section D: P&L Statement */}
      {pnl && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>📊 KẾT QUẢ KINH DOANH — {pnl.month}</h3>
          </div>
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
      )}

      {/* Section E: Expense Management */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>📝 Quản Lý Khoản Chi</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {isAdmin && <button onClick={() => setShowCatDialog(true)} style={btnSec}>⚙ Quản lý danh mục</button>}
            {isAdmin && <button onClick={() => { setEditingExpense(null); setExpForm({ categoryId: "", title: "", amount: "", date: "", note: "" }); setShowExpenseDialog(true); }} style={btnPrimary}>+ Thêm khoản chi</button>}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
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
              {expenses.map((e, i) => (
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
      </div>

      {/* Section F: Monthly Budget */}
      {budgets && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          {budgets.hasAlert && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#991b1b" }}>
              ⚠️ Có danh mục chi phí đã vượt 90% ngân sách!
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>💰 Ngân Sách Hàng Tháng — {budgets.month}</h3>
            {isAdmin && <button onClick={() => { const f: Record<string, string> = {}; budgets.budgets?.forEach((b: any) => { f[b.categoryId] = String(b.budgetAmount || 0); }); setBudgetForm(f); setShowBudgetDialog(true); }} style={btnSec}>⚙ Đặt ngân sách</button>}
          </div>
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
      )}

      {/* Expense Dialog */}
      {showExpenseDialog && (
        <div style={dlgStyle} onClick={() => setShowExpenseDialog(false)}>
          <div style={dlgInner} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>{editingExpense ? "Sửa khoản chi" : "Thêm khoản chi"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={labelStyle}>Danh mục *</label><select value={expForm.categoryId} onChange={e => setExpForm({ ...expForm, categoryId: e.target.value })} style={inputStyle}><option value="">Chọn</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
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
            {categories.map(c => (
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
            {categories.map(c => (
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
