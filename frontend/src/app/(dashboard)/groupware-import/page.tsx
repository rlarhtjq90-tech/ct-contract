"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { groupwareImport } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { format } from "date-fns";
import { CheckCircle, HelpCircle, XCircle } from "lucide-react";
import { fmtNum } from "@/lib/format";

export default function GroupwareImportPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Record<number, { subcontractId: number; billingMonth: string }>>({});
  const [busy, setBusy] = useState<Set<number>>(new Set());

  const { data: summary } = useQuery({
    queryKey: ["groupware-import-summary"],
    queryFn: () => groupwareImport.getSummary(),
  });

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["groupware-import-queue"],
    queryFn: () => groupwareImport.getReviewQueue(),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["groupware-import-summary"] });
    queryClient.invalidateQueries({ queryKey: ["groupware-import-queue"] });
  };

  const handleApply = async (lineId: number) => {
    const pick = selected[lineId];
    if (!pick?.subcontractId || !pick?.billingMonth) return;
    setBusy((prev) => new Set(prev).add(lineId));
    try {
      await groupwareImport.apply(lineId, pick);
      refresh();
    } finally {
      setBusy((prev) => {
        const s = new Set(prev);
        s.delete(lineId);
        return s;
      });
    }
  };

  const handleIgnore = async (lineId: number) => {
    setBusy((prev) => new Set(prev).add(lineId));
    try {
      await groupwareImport.ignore(lineId);
      refresh();
    } finally {
      setBusy((prev) => {
        const s = new Set(prev);
        s.delete(lineId);
        return s;
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="외주비 자동연동 검토" subtitle="그룹웨어 전자결재 가져오기" />

      <div
        className="flex items-center gap-3 flex-wrap px-6 py-3"
        style={{ background: "#F6F8FA", borderBottom: "1px solid #E6E6E6", flexShrink: 0 }}
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ background: "#E8F9F2", border: "1px solid #B8EFDA" }}>
          <CheckCircle size={13} style={{ color: "#1DC078" }} />
          <span className="text-xs font-medium" style={{ color: "#1DC078" }}>
            자동 반영 {summary?.autoMatched ?? 0}건
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
          style={{ background: "#FFF8E8", border: "1px solid #FCE3A8" }}>
          <HelpCircle size={13} style={{ color: "#E6A23C" }} />
          <span className="text-xs font-medium" style={{ color: "#E6A23C" }}>
            검토 대기 {summary?.needsReview ?? 0}건
          </span>
        </div>
        <span className="text-xs" style={{ color: "#999" }}>
          수동 적용 {summary?.applied ?? 0}건 · 무시 {summary?.ignored ?? 0}건
        </span>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-6 pt-4 flex flex-col">
        <div className="ct-card overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="ct-table" style={{ minWidth: "1100px" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#F7F8FA" }}>
                <tr>
                  <th style={{ minWidth: "180px" }}>문서제목</th>
                  <th style={{ minWidth: "140px" }}>거래처(원문)</th>
                  <th style={{ minWidth: "160px" }}>현장명(원문)</th>
                  <th className="text-right" style={{ minWidth: "110px" }}>공급가액</th>
                  <th style={{ minWidth: "200px" }}>매칭할 하도급계약</th>
                  <th style={{ minWidth: "110px" }}>기성월</th>
                  <th style={{ minWidth: "120px" }}>처리</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-10" style={{ color: "#AAA" }}>불러오는 중...</td></tr>
                ) : queue.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div style={{ color: "#AAA", fontSize: 13 }}>검토 대기 중인 항목이 없습니다.</div>
                    </td>
                  </tr>
                ) : (
                  queue.map((line: any) => {
                    const pick = selected[line.id] || {};
                    const defaultMonth = (line.paymentRequestDate || line.transactionDate || "").slice(0, 7)
                      || format(new Date(), "yyyy-MM");

                    return (
                      <tr key={line.id}>
                        <td>
                          <div className="text-sm font-medium" style={{ color: "#333" }}>{line.document?.title}</div>
                          <div className="text-xs" style={{ color: "#999" }}>{line.description}</div>
                        </td>
                        <td className="text-sm" style={{ color: "#333" }}>{line.vendorName}</td>
                        <td className="text-sm" style={{ color: "#333" }}>{line.siteName}</td>
                        <td className="text-right text-sm" style={{ color: "#333" }}>{fmtNum(line.supplyAmount)}</td>
                        <td>
                          <select
                            value={pick.subcontractId ?? ""}
                            onChange={(e) =>
                              setSelected((prev) => ({
                                ...prev,
                                [line.id]: {
                                  subcontractId: Number(e.target.value),
                                  billingMonth: prev[line.id]?.billingMonth || defaultMonth,
                                },
                              }))
                            }
                            className="w-full px-2 py-1.5 rounded text-sm outline-none"
                            style={{ border: "1px solid #E6E6E6", color: "#333" }}
                          >
                            <option value="">선택...</option>
                            {(line.candidates || []).map((c: any) => (
                              <option key={c.id} value={c.id}>
                                {c.project?.name} / {c.subcontractor?.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="month"
                            value={pick.billingMonth ?? defaultMonth}
                            onChange={(e) =>
                              setSelected((prev) => ({
                                ...prev,
                                [line.id]: { subcontractId: prev[line.id]?.subcontractId || 0, billingMonth: e.target.value },
                              }))
                            }
                            className="px-2 py-1.5 rounded text-sm outline-none"
                            style={{ border: "1px solid #E6E6E6", color: "#333" }}
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleApply(line.id)}
                              disabled={busy.has(line.id) || !pick.subcontractId}
                              className="text-xs px-2 py-1 rounded font-medium transition-colors hover:bg-[#F5F5F5]"
                              style={{ color: pick.subcontractId ? "#1C90FB" : "#CCC" }}
                            >
                              적용
                            </button>
                            <button
                              onClick={() => handleIgnore(line.id)}
                              disabled={busy.has(line.id)}
                              className="text-xs px-2 py-1 rounded font-medium transition-colors hover:bg-[#F5F5F5] flex items-center gap-1"
                              style={{ color: "#999" }}
                            >
                              <XCircle size={12} />
                              무시
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
