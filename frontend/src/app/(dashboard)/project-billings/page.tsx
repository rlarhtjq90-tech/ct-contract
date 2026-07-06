"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectBillings } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, Download } from "lucide-react";
import { fmtNum } from "@/lib/format";
import { exportProjectBillings } from "@/lib/excel";

export default function ProjectBillingsPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [projectSearch, setProjectSearch] = useState("");
  const [edits, setEdits] = useState<Record<number, { actualAmount: number }>>({});
  const [editingRows, setEditingRows] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState<Set<number>>(new Set());

  const { data: billingList = [], isLoading } = useQuery({
    queryKey: ["project-billings", month],
    queryFn: () => projectBillings.getByMonth(month),
  });

  const handleConfirm = async (id: number, actualAmount: number) => {
    setConfirming((prev) => new Set(prev).add(id));
    try {
      await projectBillings.bulkUpdate([{ id, actualAmount }]);
      await projectBillings.approve(id);
      setEditingRows((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      setEdits((prev) => {
        const n = { ...prev };
        delete n[id];
        return n;
      });
      queryClient.invalidateQueries({ queryKey: ["project-billings", month] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    } finally {
      setConfirming((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  };

  const handleEdit = (id: number, currentAmount: number) => {
    setEditingRows((prev) => new Set(prev).add(id));
    setEdits((prev) => ({ ...prev, [id]: { actualAmount: currentAmount } }));
  };

  const anomalyCount = (billingList as any[]).filter((b) => b.isAnomaly).length;
  const approvedCount = (billingList as any[]).filter((b) => b.status === "approved").length;

  const filtered = (billingList as any[]).filter((b) => {
    const q = projectSearch.toLowerCase();
    return (
      b.project?.name?.toLowerCase().includes(q) ||
      b.project?.client?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="도급 기성현황"
        subtitle={`${month} 기준 — 발주처 기성 입력`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportProjectBillings(month, billingList as any[])}
              disabled={(billingList as any[]).length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <Download size={14} />
              엑셀
            </button>
          </div>
        }
      />

      {/* 고정 필터 바 */}
      <div
        className="flex items-center gap-4 flex-wrap px-6 py-3"
        style={{ background: "#F6F8FA", borderBottom: "1px solid #E6E6E6", flexShrink: 0 }}
      >
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: "#666" }}>기성 월</label>
          <input
            type="month"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setEdits({});
              setEditingRows(new Set());
            }}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ border: "1px solid #E6E6E6", color: "#333" }}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: "#666" }}>검색</label>
          <input
            type="text"
            placeholder="발주처 또는 도급계약명 입력..."
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ border: "1px solid #E6E6E6", color: "#333", minWidth: 200 }}
          />
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {anomalyCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ background: "#FFF0F0", border: "1px solid #FFD6D7" }}>
              <AlertTriangle size={13} style={{ color: "#FC5356" }} />
              <span className="text-xs font-medium" style={{ color: "#FC5356" }}>
                이상치 {anomalyCount}건
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ background: "#E8F9F2", border: "1px solid #B8EFDA" }}>
            <CheckCircle size={13} style={{ color: "#1DC078" }} />
            <span className="text-xs font-medium" style={{ color: "#1DC078" }}>
              확정완료 {approvedCount}/{(billingList as any[]).length}건
            </span>
          </div>
        </div>
      </div>

      {/* 스크롤 가능한 테이블 영역 */}
      <div className="flex-1 min-h-0 px-6 pb-6 pt-4 flex flex-col">
        {/* 기성 그리드 */}
        <div className="ct-card overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="ct-table" style={{ minWidth: "1000px" }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#F7F8FA" }}>
                <tr>
                  <th style={{ minWidth: "120px" }}>발주처</th>
                  <th style={{ minWidth: "160px" }}>도급계약명</th>
                  <th className="text-right" style={{ minWidth: "110px" }}>계약금액</th>
                  <th className="text-right" style={{ minWidth: "90px" }}>전회금액</th>
                  <th className="text-right" style={{ minWidth: "110px" }}>당월금액</th>
                  <th className="text-right" style={{ minWidth: "90px" }}>누적금액</th>
                  <th style={{ minWidth: "110px" }}>기성률</th>
                  <th style={{ minWidth: "70px" }}>비고</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10" style={{ color: "#AAA" }}>
                      불러오는 중...
                    </td>
                  </tr>
                ) : (billingList as any[]).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div style={{ color: "#AAA", fontSize: 13 }}>
                        {month} 도급 기성 데이터가 없습니다.
                        <br />도급계약을 먼저 등록하세요.
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div style={{ color: "#AAA", fontSize: 13 }}>
                        "{projectSearch}"에 해당하는 항목이 없습니다.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((b: any) => {
                    const edit = edits[b.id] || {};
                    const isEdited = b.id in edits;
                    const isConfirmed = b.status === "approved";
                    const isEditing = editingRows.has(b.id);
                    const isEditable = !isConfirmed || isEditing;

                    const contractAmt = Number(b.project?.currentAmount || 0);
                    const editedAmt = edit.actualAmount ?? Number(b.actualAmount);
                    const prevCumul = Number(b.cumulativeAmount) - Number(b.actualAmount);
                    const newCumul = prevCumul + editedAmt;
                    const liveRate = contractAmt > 0 ? (newCumul / contractAmt) * 100 : 0;

                    return (
                      <tr
                        key={b.id}
                        style={b.isAnomaly ? { background: "#FFF8F8" } : undefined}
                      >
                        <td>
                          <div className="text-xs" style={{ color: "#666" }}>
                            {b.project?.client?.name || "-"}
                          </div>
                        </td>
                        <td>
                          <div className="font-medium text-sm" style={{ color: "#333" }}>
                            {b.project?.name}
                          </div>
                          {b.isAnomaly && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <AlertTriangle size={10} style={{ color: "#FC5356" }} />
                              <span style={{ fontSize: 10, color: "#FC5356" }}>
                                {b.anomalyReason}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="text-right text-sm" style={{ color: "#333" }}>
                          {fmtNum(contractAmt)}
                        </td>
                        {/* 전회금액 */}
                        <td className="text-right text-sm" style={{ color: "#999" }}>
                          {fmtNum(prevCumul)}
                        </td>
                        {/* 당월금액 */}
                        <td className="text-right">
                          {isEditable ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editedAmt ? fmtNum(editedAmt) : ""}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const raw = parseInt(e.target.value.replace(/,/g, "")) || 0;
                                setEdits((prev) => ({
                                  ...prev,
                                  [b.id]: { ...prev[b.id], actualAmount: raw },
                                }));
                              }}
                              className="w-full text-right px-2 py-1 rounded text-sm outline-none"
                              style={{
                                border: `1px solid ${isEdited || isEditing ? "#1C90FB" : "#E6E6E6"}`,
                                color: "#333",
                              }}
                            />
                          ) : (
                            <span className="text-sm font-medium" style={{ color: "#333" }}>
                              {fmtNum(editedAmt)}
                            </span>
                          )}
                        </td>
                        {/* 누적금액 (실시간) */}
                        <td className="text-right text-sm" style={{ color: "#333" }}>
                          {fmtNum(newCumul)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: "#F0F0F0", minWidth: 60 }}>
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  background: liveRate > 100 ? "#FC5356" : "#1C90FB",
                                  width: `${Math.min(liveRate, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium" style={{ color: "#333", minWidth: 36 }}>
                              {liveRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          {isEditable ? (
                            <button
                              onClick={() => handleConfirm(b.id, editedAmt)}
                              disabled={confirming.has(b.id)}
                              className="text-xs px-2 py-1 rounded font-medium transition-colors hover:bg-[#F5F5F5]"
                              style={{ color: confirming.has(b.id) ? "#AAA" : "#1C90FB" }}
                            >
                              {confirming.has(b.id) ? "처리 중..." : "확정"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleEdit(b.id, Number(b.actualAmount))}
                              className="text-xs px-2 py-1 rounded font-medium transition-colors hover:bg-[#F5F5F5]"
                              style={{ color: "#7C3AED" }}
                            >
                              수정
                            </button>
                          )}
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
