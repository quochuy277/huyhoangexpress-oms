"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { CLAIMS_MOBILE_BREAKPOINT } from "@/components/claims/claims-table/claimsResponsive";
import {
  CLAIM_STATUS_CONFIG,
  ISSUE_TYPE_CONFIG,
  formatClaimMoney,
  type ClaimStatusKey,
  type IssueTypeKey,
} from "@/lib/claims-config";

type DetailClaim = {
  id: string;
  requestCode: string;
  detectedDate: string;
  issueType: string;
  claimStatus: string;
  carrierCompensation: number;
  customerCompensation: number;
};

type DetailResponse = {
  claims: DetailClaim[];
  pagination: { page: number; pageSize: number; total: number };
};

const PAGE_SIZE = 20;

const DETAIL_TABLE_HEADERS = ["STT", "Mã YC", "Ngày PH", "Loại VĐ", "TT Xử Lý", "Tiền NVC ĐB", "Tiền ĐB KH"];

function pagerBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px",
    borderRadius: "8px", border: "1px solid #d1d5db",
    background: disabled ? "#f8fafc" : "#fff",
    fontSize: "12px", fontWeight: 600,
    color: disabled ? "#cbd5e1" : "#374151",
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

export function ShopClaimsDetailModal({
  shopName,
  dateFrom,
  dateTo,
  onClose,
}: {
  shopName: string;
  dateFrom: string;
  dateTo: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const { data, isLoading, isError } = useQuery<DetailResponse>({
    queryKey: ["claims-compensation-details", shopName, dateFrom, dateTo, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        shopName,
        dateFrom,
        dateTo,
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/claims/compensation/details?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải chi tiết đền bù");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const claims = data?.claims ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return createPortal(
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 10050, backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết đền bù cửa hàng ${shopName}`}
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 10051, background: "#fff", border: "1.5px solid #2563EB",
          borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column",
          width: "min(860px, calc(100vw - 24px))", maxHeight: "90vh",
        }}
      >
        <style>{`
          @media (max-width: ${CLAIMS_MOBILE_BREAKPOINT - 1}px) {
            .claims-compensation-detail-table { display: none !important; }
            .claims-compensation-detail-cards { display: flex !important; }
          }
          @media (min-width: ${CLAIMS_MOBILE_BREAKPOINT}px) {
            .claims-compensation-detail-cards { display: none !important; }
          }
        `}</style>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #e5e7eb", padding: "14px 20px", gap: "10px",
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {shopName}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Đơn có vấn đề trong kỳ đã lọc · {total} đơn
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng chi tiết đền bù"
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "4px",
              borderRadius: "6px", color: "#666", display: "flex", flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "14px 20px", overflowY: "auto", flex: 1, minHeight: 0 }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px", color: "#6b7280" }}>
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : isError ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#b91c1c", fontSize: "13px" }}>
              Không thể tải chi tiết đền bù. Vui lòng thử lại.
            </div>
          ) : claims.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px", color: "#9ca3af", fontSize: "13px" }}>
              Không có đơn nào trong kỳ đã lọc
            </div>
          ) : (
            <>
              <div className="claims-compensation-detail-table" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e5e7eb" }}>
                      {DETAIL_TABLE_HEADERS.map((header) => (
                        <th
                          key={header}
                          style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim, index) => {
                      const issueConfig = ISSUE_TYPE_CONFIG[claim.issueType as IssueTypeKey] || ISSUE_TYPE_CONFIG.OTHER;
                      const statusConfig = CLAIM_STATUS_CONFIG[claim.claimStatus as ClaimStatusKey] || CLAIM_STATUS_CONFIG.PENDING;
                      return (
                        <tr
                          key={claim.id}
                          style={{ borderBottom: "1px solid #f1f5f9", background: index % 2 === 0 ? "#fff" : "#f9fafb" }}
                        >
                          <td style={{ padding: "8px 10px", color: "#94a3b8" }}>
                            {(page - 1) * PAGE_SIZE + index + 1}
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 700, color: "#2563EB", fontFamily: "monospace" }}>
                            {claim.requestCode}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#475569", whiteSpace: "nowrap" }}>
                            {format(new Date(claim.detectedDate), "dd/MM/yyyy")}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${issueConfig.bg} ${issueConfig.text} ${issueConfig.border}`}>
                              {issueConfig.label}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px", color: "#16a34a", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {formatClaimMoney(claim.carrierCompensation)}
                          </td>
                          <td style={{ padding: "8px 10px", color: "#dc2626", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {formatClaimMoney(claim.customerCompensation)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                className="claims-compensation-detail-cards"
                data-testid="claims-compensation-detail-cards"
                style={{ display: "none", flexDirection: "column", gap: "10px" }}
              >
                {claims.map((claim) => {
                  const issueConfig = ISSUE_TYPE_CONFIG[claim.issueType as IssueTypeKey] || ISSUE_TYPE_CONFIG.OTHER;
                  const statusConfig = CLAIM_STATUS_CONFIG[claim.claimStatus as ClaimStatusKey] || CLAIM_STATUS_CONFIG.PENDING;
                  return (
                    <article
                      key={`${claim.id}-card`}
                      style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "12px", background: "#fff" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                        <span style={{ fontWeight: 700, color: "#2563EB", fontFamily: "monospace", fontSize: "13px" }}>
                          {claim.requestCode}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {format(new Date(claim.detectedDate), "dd/MM/yy")}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${issueConfig.bg} ${issueConfig.text} ${issueConfig.border}`}>
                          {issueConfig.label}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px", fontSize: "12px" }}>
                        <div style={{ color: "#16a34a" }}>
                          NVC ĐB: <strong>{formatClaimMoney(claim.carrierCompensation)}</strong>
                        </div>
                        <div style={{ color: "#dc2626" }}>
                          ĐB KH: <strong>{formatClaimMoney(claim.customerCompensation)}</strong>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderTop: "1px solid #e5e7eb", padding: "12px 20px", gap: "10px",
        }}>
          <span style={{ fontSize: "12px", color: "#64748b" }}>
            Trang {page}/{totalPages}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              aria-label="Trang trước chi tiết đền bù"
              style={pagerBtnStyle(page <= 1)}
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <button
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              aria-label="Trang sau chi tiết đền bù"
              style={pagerBtnStyle(page >= totalPages)}
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
