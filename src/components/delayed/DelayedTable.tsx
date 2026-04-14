import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Copy, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

function DelayedTableSortIcon({
  activeSortKey,
  colKey,
  sortDir,
}: {
  activeSortKey: string;
  colKey: string;
  sortDir: "asc" | "desc";
}) {
  if (activeSortKey !== colKey) {
    return <ChevronDown className="ml-1 inline-block h-3 w-3 text-slate-300" />;
  }

  return sortDir === "desc" ? (
    <ChevronDown className="ml-1 inline-block h-3 w-3 text-blue-600" />
  ) : (
    <ChevronUp className="ml-1 inline-block h-3 w-3 text-blue-600" />
  );
}

export function DelayedTable({ data, isLoading }: { data: any[]; isLoading: boolean }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  // Sorting
  const [sortKey, setSortKey] = useState("riskScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Sort function
  const sortedData = [...data].sort((a, b) => {
    let va = a[sortKey];
    let vb = b[sortKey];

    if (typeof va === "string") {
      va = va.toLowerCase();
      vb = (vb || "").toLowerCase();
    }

    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;

    // Fallback sort by riskScore
    if (sortKey !== "riskScore") {
      return b.riskScore - a.riskScore;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
  const pageData = sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCopy = (order: any) => {
    const text = `Mã đơn: ${order.carrierOrderCode || order.requestCode}\nTên: ${order.receiverName} - SĐT: ${order.receiverPhone}\nĐC: ${order.fullAddress}`;
    navigator.clipboard.writeText(text);
    setCopiedId(order.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const RequestSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex-1 overflow-auto custom-scrollbar">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[60px] text-[12px] font-medium uppercase text-slate-500 text-center whitespace-nowrap">STT</TableHead>
              <TableHead 
                className="text-[12px] font-medium uppercase text-slate-500 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => RequestSort("requestCode")}
              >Mã Yêu Cầu <DelayedTableSortIcon activeSortKey={sortKey} colKey="requestCode" sortDir={sortDir} /></TableHead>
              <TableHead 
                className="text-[12px] font-medium uppercase text-slate-500 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => RequestSort("shopName")}
              >Cửa Hàng <DelayedTableSortIcon activeSortKey={sortKey} colKey="shopName" sortDir={sortDir} /></TableHead>
              <TableHead className="text-[12px] font-medium uppercase text-slate-500 min-w-[200px]">Thông Tin Giao Hàng</TableHead>
              <TableHead 
                className="text-[12px] font-medium uppercase text-slate-500 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => RequestSort("status")}
              >Trạng Thái <DelayedTableSortIcon activeSortKey={sortKey} colKey="status" sortDir={sortDir} /></TableHead>
              <TableHead 
                className="text-[12px] font-medium uppercase text-slate-500 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors text-center"
                onClick={() => RequestSort("delayCount")}
              >Hoãn <DelayedTableSortIcon activeSortKey={sortKey} colKey="delayCount" sortDir={sortDir} /></TableHead>
              <TableHead 
                className="text-[12px] font-medium uppercase text-slate-500 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => RequestSort("daysAge")}
              >Thời Gian <DelayedTableSortIcon activeSortKey={sortKey} colKey="daysAge" sortDir={sortDir} /></TableHead>
              <TableHead className="text-[12px] font-medium uppercase text-slate-500">Lý Do Đã Lọc</TableHead>
              <TableHead className="text-[12px] font-medium uppercase text-slate-500 min-w-[200px]">Chi Tiết Note</TableHead>
              <TableHead 
                className="text-[12px] font-medium uppercase text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors text-center"
                onClick={() => RequestSort("riskScore")}
              >Risk <DelayedTableSortIcon activeSortKey={sortKey} colKey="riskScore" sortDir={sortDir} /></TableHead>
              <TableHead 
                className="text-[12px] font-medium uppercase text-slate-500 text-right whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => RequestSort("codAmount")}
              >Thu Hộ (VND) <DelayedTableSortIcon activeSortKey={sortKey} colKey="codAmount" sortDir={sortDir} /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11} className="h-48 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin mb-3"></div>
                    <p className="text-sm font-medium">Đang phân tích dữ liệu hoãn giao...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : pageData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-48 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center p-6">
                    <p className="font-medium text-slate-700">Không tìm thấy đơn hàng hoãn giao phù hợp</p>
                    <p className="text-sm text-slate-400 mt-1">Vui lòng thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageData.map((o, idx) => {
                const isRiskHigh = o.risk === "high";
                const isRiskMed = o.risk === "medium";
                
                return (
                  <TableRow 
                    key={o.id}
                    className={`
                      border-b border-slate-100 transition-colors
                      ${isRiskHigh ? "border-l-[3px] border-l-red-500 hover:bg-red-50/30" : 
                        isRiskMed ? "border-l-[3px] border-l-amber-500 hover:bg-amber-50/20" : 
                        "border-l-[3px] border-l-emerald-500 hover:bg-emerald-50/20"}
                    `}
                  >
                    <TableCell className="px-3 py-3 text-center font-medium text-slate-500 text-[13px]">
                      {(currentPage - 1) * PAGE_SIZE + idx + 1}
                    </TableCell>
                    <TableCell className="px-3 py-3 font-semibold text-slate-700 text-[13px] whitespace-nowrap">
                      {o.requestCode}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-slate-600 text-[13px]">
                      {o.shopName || "-"}
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="text-[12px] text-slate-600 space-y-1">
                        <div><span className="font-semibold text-slate-700">Đơn đối tác:</span> {o.carrierOrderCode || '-'}</div>
                        <div><span className="font-semibold text-slate-700">Tên:</span> <span className="font-medium">{o.receiverName}</span> - <span className="font-semibold text-slate-700">SĐT:</span> <span className="font-medium text-blue-600">{o.receiverPhone}</span></div>
                        <div className="truncate max-w-[200px]" title={o.fullAddress}><span className="font-semibold text-slate-700">ĐC:</span> {o.fullAddress}</div>
                        
                        <button 
                          onClick={() => handleCopy(o)}
                          className={`mt-1 inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase tracking-wide transition-all font-semibold
                            ${copiedId === o.id 
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
                        >
                          {copiedId === o.id ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copiedId === o.id ? "Đã chép" : "Copy"}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap
                        ${o.status.includes("Hoãn") ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                        {o.status}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-bold text-[13px]
                        ${o.delayCount >= 3 ? "bg-red-100 text-red-700" : 
                          o.delayCount >= 2 ? "bg-amber-100 text-amber-700" : 
                          "bg-emerald-100 text-emerald-700"}`}>
                        {o.delayCount}
                      </span>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-[12px] whitespace-nowrap">
                      {o.createdTime ? format(new Date(o.createdTime), "dd/MM/yyyy", { locale: vi }) : "-"}
                      <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{o.daysAge} ngày trước</div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {o.uniqueReasons.map((r: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] rounded-sm font-medium border border-slate-200 leading-tight">
                            {r}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3">
                      <div className="text-[11px] text-slate-600 max-w-[250px] space-y-1 relative pl-3 border-l-2 border-amber-300">
                        {o.delays.length > 0 ? (
                          o.delays.map((d: any, i: number) => (
                            <div key={i} className="leading-snug">
                              <span className="font-semibold text-slate-700">{d.time} {d.date}:</span> {d.reason}
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Chi tiết nằm trong Ghi chú nội bộ</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center">
                      <div className={`inline-flex items-center justify-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full
                        ${isRiskHigh ? "bg-red-50 text-red-600 border border-red-200" : 
                          isRiskMed ? "bg-amber-50 text-amber-600 border border-amber-200" : 
                          "bg-emerald-50 text-emerald-600 border border-emerald-200"}`}
                      >
                         <span className={`w-1.5 h-1.5 rounded-full mr-1.5 
                           ${isRiskHigh ? "bg-red-500" : isRiskMed ? "bg-amber-500" : "bg-emerald-500"}`}></span>
                         {o.risk === "high" ? "Cao" : o.risk === "medium" ? "T.Bình" : "Thấp"}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right font-medium text-slate-700 text-[13px] whitespace-nowrap">
                      {o.codAmount.toLocaleString("vi-VN")} đ
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && totalPages > 1 && (
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-between shrink-0">
          <span className="text-[13px] text-slate-500 font-medium">
            Hiển thị trang <b className="text-slate-700">{currentPage}</b> / {totalPages} ({data.length} đơn hoãn)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 flex items-center justify-center border border-slate-200 rounded text-[13px] font-medium bg-white hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Trước
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 flex items-center justify-center border border-slate-200 rounded text-[13px] font-medium bg-white hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-sm"
            >
              Sau <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
