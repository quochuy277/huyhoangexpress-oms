"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Line, ComposedChart } from "recharts";
import { buildCashbookTransactionSummary, buildShopPayoutSummary } from "./financeResponsive";

const PERIODS = [
  { value: "month", label: "Tháng này" }, { value: "last_month", label: "Tháng trước" },
  { value: "quarter", label: "Quý" }, { value: "custom", label: "Tùy chọn" },
];
const GROUP_LABELS: Record<string, { label: string; color: string }> = {
  COD: { label: "COD", color: "#10b981" }, SHOP_PAYOUT: { label: "Trả shop", color: "#ef4444" },
  RECONCILIATION_FEE: { label: "Phí ĐS", color: "#94a3b8" }, TOP_UP: { label: "Nạp tiền", color: "#2563eb" },
  COMPENSATION: { label: "Đền bù", color: "#8b5cf6" }, COOPERATION_FEE: { label: "Phí HT", color: "#f59e0b" },
  OTHER: { label: "Khác", color: "#64748b" },
};
const PIE_COLORS = ["#10b981", "#ef4444", "#94a3b8", "#2563eb", "#8b5cf6", "#f59e0b", "#64748b"];
const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";

export default function CashbookTab({ initialData = null }: { initialData?: any }) {
  const [period, setPeriod] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploads, setUploads] = useState<any[]>(() => initialData?.uploads || []);
  const [summary, setSummary] = useState<any>(() => initialData?.summary || null);
  const [transactions, setTransactions] = useState<any[]>(() => initialData?.transactions || []);
  const [pagination, setPagination] = useState<{ total: number; page: number; pageSize: number; pages: number }>(
    () => initialData?.pagination || { total: 0, page: 1, pageSize: 20, pages: 0 },
  );
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const skipInitialFetchRef = useRef(Boolean(initialData));

  const fetchData = useCallback(async () => {
    const groupParam = groupFilter.length > 0 ? `&group=${groupFilter.join(",")}` : "";
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
    const customParams = period === "custom" && customFrom && customTo ? `&from=${customFrom}&to=${customTo}` : "";
    const [sumRes, txRes, upRes] = await Promise.all([
      fetch(`/api/finance/cashbook/summary?period=${period}${customParams}`).then(r => r.json()),
      fetch(`/api/finance/cashbook?period=${period}&page=${pagination.page}&pageSize=${pagination.pageSize}${groupParam}${searchParam}${customParams}`).then(r => r.json()),
      fetch("/api/finance/cashbook/uploads").then(r => r.json()),
    ]);
    setSummary(sumRes); setTransactions(txRes.transactions || []); setPagination(txRes.pagination || pagination); setUploads(upRes.uploads || []);
  }, [period, pagination.page, pagination.pageSize, groupFilter, search, customFrom, customTo]);

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    void fetchData();
  }, [fetchData]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/finance/cashbook/upload", { method: "POST", body: formData });
      const data = await res.json();
      setUploadResult(data);
      fetchData();
    } catch { setUploadResult({ error: "Lỗi upload" }); }
    setUploading(false);
    e.target.value = "";
  };

  const toggleGroup = (g: string) => {
    setGroupFilter(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const applySearch = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const nextSearch = searchInput.trim();
    setSearchInput(nextSearch);
    setSearch(nextSearch);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const cardStyle = (color: string): React.CSSProperties => ({
    background: "#fff", borderRadius: 12, padding: "16px 20px", borderLeft: `4px solid ${color}`,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)", flex: "1 1 200px",
  });
  const panelClass = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";
  const toggleButtonClass = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
      active
        ? "border-blue-200 bg-blue-600 text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800"
    }`;

  const s = summary?.summary;
  const lastUpload = uploads[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="sr-only">Sổ quỹ</div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)} className={toggleButtonClass(period === p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {period === "custom" && (
        <div className={`${panelClass} grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[auto,1fr,auto,1fr] xl:items-center`}>
          <label className="text-sm font-semibold text-slate-600">Từ</label>
          <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label className="text-sm font-semibold text-slate-600">Đến</label>
          <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
      )}

      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="mb-3 text-sm font-bold text-slate-800 sm:text-[15px]">📤 Tải lên file công nợ</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {uploading ? "⏳ Đang xử lý..." : "Chọn file Excel (.xlsx)"}
            <input type="file" accept=".xlsx,.xls" onChange={handleUpload} disabled={uploading} style={{ display: "none" }} />
          </label>
          {uploadResult && !uploadResult.error && (
            <div style={{ fontSize: 13, color: "#10b981" }}>
              ✅ Đã tải lên: {uploadResult.newRows} giao dịch mới
              {uploadResult.replacedRows > 0 && <>, {uploadResult.replacedRows} đã cập nhật</>}
              {uploadResult.duplicateRows > 0 && <>, {uploadResult.duplicateRows} trùng lặp</>}
            </div>
          )}
          {uploadResult?.error && <div style={{ fontSize: 13, color: "#ef4444" }}>❌ {uploadResult.error}</div>}
        </div>
        {lastUpload && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
            Lần upload gần nhất: {new Date(lastUpload.uploadedAt).toLocaleDateString("vi-VN")} bởi {lastUpload.uploadedBy} | Tổng giao dịch: {lastUpload.rowCount} | Dữ liệu từ {lastUpload.dateFrom ? new Date(lastUpload.dateFrom).toLocaleDateString("vi-VN") : "?"} → {lastUpload.dateTo ? new Date(lastUpload.dateTo).toLocaleDateString("vi-VN") : "?"}
          </div>
        )}

        {/* Upload history */}
        {uploads.length > 1 && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 13, cursor: "pointer", color: "#2563eb" }}>📋 Lịch sử upload ({uploads.length})</summary>
            <div className="hidden md:block">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
              <thead><tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: 6, textAlign: "left" }}>Ngày</th><th style={{ padding: 6, textAlign: "left" }}>File</th>
                <th style={{ padding: 6, textAlign: "right" }}>Mới</th><th style={{ padding: 6, textAlign: "right" }}>Trùng</th>
                <th style={{ padding: 6, textAlign: "left" }}>Dữ liệu</th><th style={{ padding: 6, textAlign: "left" }}>Người Upload</th>
              </tr></thead>
              <tbody>
                {uploads.map(u => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 4 }}>{new Date(u.uploadedAt).toLocaleDateString("vi-VN")}</td>
                    <td style={{ padding: 4 }}>{u.fileName}</td>
                    <td style={{ padding: 4, textAlign: "right" }}>{u.newRows}</td>
                    <td style={{ padding: 4, textAlign: "right" }}>{u.duplicateRows}</td>
                    <td style={{ padding: 4 }}>{u.dateFrom ? new Date(u.dateFrom).toLocaleDateString("vi-VN") : ""} → {u.dateTo ? new Date(u.dateTo).toLocaleDateString("vi-VN") : ""}</td>
                    <td style={{ padding: 4 }}>{u.uploadedBy}</td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-3 md:hidden">
              {uploads.map((upload) => (
                <div key={upload.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="font-semibold text-slate-800">{upload.fileName}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>Ngày: {new Date(upload.uploadedAt).toLocaleDateString("vi-VN")}</div>
                    <div>Người upload: {upload.uploadedBy}</div>
                    <div>Mới: {upload.newRows}</div>
                    <div>Trùng: {upload.duplicateRows}</div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {s && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div style={cardStyle("#10b981")}><div style={{ fontSize: 12, color: "#64748b" }}>COD Nhận Về</div><div style={{ fontSize: 22, fontWeight: 700, color: "#10b981" }}>{fmtVND(s.codTotal)}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{s.codCount} đợt</div></div>
          <div style={cardStyle("#ef4444")}><div style={{ fontSize: 12, color: "#64748b" }}>Đã Trả Shop</div><div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444" }}>{fmtVND(Math.abs(s.shopPayoutTotal))}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{s.shopPayoutCount} lần</div></div>
          <div style={cardStyle("#2563eb")}><div style={{ fontSize: 12, color: "#64748b" }}>Nạp Tiền</div><div style={{ fontSize: 22, fontWeight: 700, color: "#2563eb" }}>{fmtVND(s.topUpTotal)}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{s.topUpCount} lần</div></div>
          <div style={cardStyle("#2563eb")}><div style={{ fontSize: 12, color: "#64748b" }}>Số Dư Cuối Kỳ</div><div style={{ fontSize: 22, fontWeight: 700, color: "#2563eb" }}>{fmtVND(s.latestBalance)}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>Cập nhật {s.latestDate ? new Date(s.latestDate).toLocaleDateString("vi-VN") : "—"}</div></div>
        </div>
      )}

      <div className={panelClass}>
        <h3 className="mb-3 text-sm font-bold text-slate-800 sm:text-[15px]">📋 Chi tiết giao dịch</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          {Object.entries(GROUP_LABELS).map(([key, { label, color }]) => (
            <button key={key} onClick={() => toggleGroup(key)} style={{
              padding: "4px 10px", borderRadius: 12, border: `1px solid ${color}`, cursor: "pointer", fontSize: 11, fontWeight: 600,
              background: groupFilter.includes(key) ? color : "#fff", color: groupFilter.includes(key) ? "#fff" : color,
            }}>{label}</button>
          ))}
          <form onSubmit={applySearch} className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[320px] sm:flex-1 sm:flex-row sm:items-center">
            <input
              placeholder="🔍 Tìm mã phiếu, nội dung..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 13, flex: "1 1 200px" }}
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:min-w-28"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>#</th>
              <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Thời Gian</th>
              <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Mã Phiếu</th>
              <th style={{ padding: 8, textAlign: "center", borderBottom: "2px solid #e2e8f0" }}>Nhóm</th>
              <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Nội Dung</th>
              <th style={{ padding: 8, textAlign: "right", borderBottom: "2px solid #e2e8f0" }}>Số Tiền</th>
              <th style={{ padding: 8, textAlign: "right", borderBottom: "2px solid #e2e8f0" }}>Tồn</th>
            </tr></thead>
            <tbody>
              {transactions.map((t, i) => {
                const g = GROUP_LABELS[t.groupType] || GROUP_LABELS.OTHER;
                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 6 }}>{(pagination.page - 1) * pagination.pageSize + i + 1}</td>
                    <td style={{ padding: 6, whiteSpace: "nowrap" }}>{new Date(t.transactionTime).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td style={{ padding: 6, fontSize: 12 }}>{t.receiptCode}</td>
                    <td style={{ padding: 6, textAlign: "center" }}><span style={{ background: g.color, color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{g.label}</span></td>
                    <td style={{ padding: 6, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.content}</td>
                    <td style={{ padding: 6, textAlign: "right", fontWeight: 600, color: t.amount >= 0 ? "#10b981" : "#ef4444" }}>{t.amount >= 0 ? "+" : ""}{fmtVND(t.amount)}</td>
                    <td style={{ padding: 6, textAlign: "right" }}>{fmtVND(t.balance)}</td>
                  </tr>
                );
              })}
              {transactions.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Chưa có giao dịch</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">
          {transactions.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
              Chưa có giao dịch
            </div>
          )}
          {transactions.map((transaction) => {
            const summary = buildCashbookTransactionSummary(transaction);
            return (
              <div key={transaction.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{summary.receiptCode}</div>
                    <div className="mt-1 text-xs text-slate-500">{summary.timeLabel}</div>
                  </div>
                  <div className={`text-right text-sm font-bold ${transaction.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {summary.amountLabel}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="col-span-2">
                    <div className="text-xs text-slate-500">Nội dung</div>
                    <div className="font-semibold text-slate-800">{summary.content}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Nhóm</div>
                    <div className="font-semibold text-slate-800">{summary.groupLabel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Tồn</div>
                    <div className="font-semibold text-slate-800">{summary.balanceLabel}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {pagination.pages > 1 && (
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Trang {pagination.page}/{pagination.pages} ({pagination.total} giao dịch)</span>
            <div style={{ display: "flex", gap: 4 }}>
              <button disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer" }}>‹</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer" }}>›</button>
              <select value={pagination.pageSize} onChange={e => setPagination(p => ({ ...p, pageSize: parseInt(e.target.value), page: 1 }))} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12 }}>
                <option value={20}>20/trang</option><option value={50}>50/trang</option><option value={100}>100/trang</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Array.isArray(summary?.dailyChart) && summary.dailyChart.length > 0 && (
          <div className={panelClass}>
            <h3 className="mb-3 text-sm font-bold text-slate-800 sm:text-[15px]">📊 Dòng tiền theo ngày</h3>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={summary.dailyChart}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} tickFormatter={(v: any) => `${Math.round(v / 1e6)}M`} />
                <Tooltip formatter={(v: any) => fmtVND(Number(v))} /><Legend />
                <Bar dataKey="codIn" name="COD nhận" fill="#10b981" />
                <Bar dataKey="shopOut" name="Trả shop" fill="#ef4444" />
                <Line type="monotone" dataKey="balance" name="Số dư" stroke="#2563eb" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
        {Array.isArray(summary?.groupDistribution) && summary.groupDistribution.length > 0 && (
          <div className={panelClass}>
            <h3 className="mb-3 text-sm font-bold text-slate-800 sm:text-[15px]">📊 Phân bố giao dịch theo nhóm</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={summary.groupDistribution} dataKey="amount" nameKey="group" cx="50%" cy="50%" outerRadius={80}
                  label={({ group, percent }: any) => `${GROUP_LABELS[group]?.label || group} ${(percent * 100).toFixed(0)}%`}>
                  {summary.groupDistribution.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmtVND(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {Array.isArray(summary?.shopPayoutSummary) && summary.shopPayoutSummary.length > 0 && (
        <div className={panelClass}>
          <h3 className="mb-3 text-sm font-bold text-slate-800 sm:text-[15px]">💳 Tổng hợp trả tiền Shop</h3>
          <div className="hidden overflow-x-auto md:block">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#f8fafc" }}>
              <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>#</th>
              <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Cửa Hàng</th>
              <th style={{ padding: 8, textAlign: "right", borderBottom: "2px solid #e2e8f0" }}>Số Lần ĐS</th>
              <th style={{ padding: 8, textAlign: "right", borderBottom: "2px solid #e2e8f0" }}>Tổng Đã Trả</th>
              <th style={{ padding: 8, textAlign: "right", borderBottom: "2px solid #e2e8f0" }}>Phí CK</th>
              <th style={{ padding: 8, textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Lần Gần Nhất</th>
            </tr></thead>
            <tbody>
              {summary.shopPayoutSummary.map((s: any, i: number) => (
                <tr key={s.shop} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 6 }}>{i + 1}</td>
                  <td style={{ padding: 6, fontWeight: 600 }}>{s.shop}</td>
                  <td style={{ padding: 6, textAlign: "right" }}>{s.count}</td>
                  <td style={{ padding: 6, textAlign: "right", fontWeight: 600 }}>{fmtVND(s.total)}</td>
                  <td style={{ padding: 6, textAlign: "right", color: "#64748b" }}>{fmtVND(s.fee)}</td>
                  <td style={{ padding: 6 }}>{s.lastDate ? new Date(s.lastDate).toLocaleDateString("vi-VN") : "—"}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {summary.shopPayoutSummary.map((item: any) => {
              const payout = buildShopPayoutSummary(item);
              return (
                <div key={item.shop} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-800">{payout.title}</div>
                    <div className="text-right text-sm font-bold text-slate-800">{payout.totalLabel}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Số lần ĐS</div>
                      <div className="font-semibold text-slate-800">{payout.countLabel}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Phí CK</div>
                      <div className="font-semibold text-slate-800">{payout.feeLabel}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-slate-500">Lần gần nhất</div>
                      <div className="font-semibold text-slate-800">{payout.lastDateLabel}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
