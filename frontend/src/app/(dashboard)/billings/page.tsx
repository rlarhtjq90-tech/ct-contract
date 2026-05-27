"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billings } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle, Download, Save } from "lucide-react";
import { fmtNum } from "@/lib/format";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: "미입력", cls: "ct-badge-gray" },
  submitted: { label: "입력완료", cls: "ct-badge-blue" },
  approved: { label: "승인완료", cls: "ct-badge-green" },
  rejected: { label: "반려", cls: "ct-badge-red" },
};

export default function BillingsPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [edits, setEdits] = useState<Record<number, { plannedAmount?: number; actualAmount?: number }>>({});
  const [saving, setSaving] = useState(false);

  const { data: billingList = [], isLoading } = useQuery({
    queryKey: ["billings", month],
    queryFn: () => billings.getByMonth(month),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => billings.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billings", month] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const handleSave = async () => {
    const updates = Object.entries(edits).map(([id, vals]) => ({
      id: parseInt(id),
      ...vals,
    }));
    if (!updates.length) return;
    setSaving(true);
    try {
      await billings.bulkUpdate(updates);
      queryClient.invalidateQueries({ queryKey: ["billings", month] });
      setEdits({});
    } finally {
      setSaving(false);
    }
  };

  const formatAmt = (v: number) => fmtNum(v);

  const anomalyCount = billingList.filter((b: any) => b.isAnomaly).length;
  const approvedCount = billingList.filter((b: any) => b.status === "approved").length;

  return (
    <div>
      <PageHeader
        title="기성 입력 / 내부 검토"
        subtitle={`${month} 기준`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!Object.keys(edits).length || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
              style={{
                background: Object.keys(edits).length ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                cursor: Object.keys(edits).length ? "pointer" : "not-allowed",
              }}
            >
              <Save size={14} />
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* 월 선택 + 요약 */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" style={{ color: "#666" }}>기성 월</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #E6E6E6", color: "#333" }}
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
                승인완료 {approvedCount}/{billingList.length}건
              </span>
            </div>
          </div>
        </div>

        {/* 기성 그리드 */}
        <div className="ct-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ct-table" style={{ minWidth: "900px" }}>
              <thead>
                <tr>
                  <th style={{ minWidth: "160px" }}>하도급사</th>
                  <th style={{ minWidth: "120px" }}>도급계약</th>
                  <th className="text-right" style={{ minWidth: "100px" }}>계약금액</th>
                  <th className="text-right" style={{ minWidth: "110px" }}>당월 계획액</th>
                  <th className="text-right" style={{ minWidth: "110px" }}>당월 실적액</th>
                  <th className="text-right" style={{ minWidth: "100px" }}>누적액</th>
                  <th style={{ minWidth: "100px" }}>기성률</th>
                  <th style={{ minWidth: "80px" }}>상태</th>
                  <th style={{ minWidth: "70px" }}>승인</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-10" style={{ color: "#AAA" }}>불러오는 중...</td></tr>
                ) : billingList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <div style={{ color: "#AAA", fontSize: 13 }}>
                        {month} 기성 데이터가 없습니다.
                        <br />하도급계약을 먼저 등록하세요.
                      </div>
                    </td>
                  </tr>
                ) : (
                  billingList.map((b: any) => {
                    const edit = edits[b.id] || {};
                    const actualVal = edit.actualAmount ?? Number(b.actualAmount);
                    const plannedVal = edit.plannedAmount ?? Number(b.plannedAmount);
                    const isEdited = b.id in edits;
                    const contractAmt = Number(b.subcontract?.currentAmount || 0);

                    return (
                      <tr
                        key={b.id}
                        className={b.isAnomaly ? "anomaly-row" : ""}
                      >
                        <td>
                          <div className="font-medium text-sm" style={{ color: "#333" }}>
                            {b.subcontract?.subcontractor?.name}
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
                        <td>
                          <div className="text-xs" style={{ color: "#666" }}>
                            {b.subcontract?.project?.name}
                          </div>
                        </td>
                        <td className="text-right text-sm" style={{ color: "#333" }}>
                          {formatAmt(contractAmt)}
                        </td>
                        <td className="text-right">
                          {b.status === "approved" ? (
                            <span className="text-sm" style={{ color: "#333" }}>
                              {formatAmt(plannedVal)}
                            </span>
                          ) : (
                            <input
                              type="number"
                              value={plannedVal || ""}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [b.id]: { ...prev[b.id], plannedAmount: parseInt(e.target.value) || 0 },
                                }))
                              }
                              className="w-full text-right px-2 py-1 rounded text-sm outline-none"
                              style={{
                                border: `1px solid ${isEdited ? "#1C90FB" : "#E6E6E6"}`,
                                color: "#333",
                              }}
                            />
                          )}
                        </td>
                        <td className="text-right">
                          {b.status === "approved" ? (
                            <span className="text-sm font-medium" style={{ color: "#333" }}>
                              {formatAmt(actualVal)}
                            </span>
                          ) : (
                            <input
                              type="number"
                              value={actualVal || ""}
                              onChange={(e) =>
                                setEdits((prev) => ({
                                  ...prev,
                                  [b.id]: { ...prev[b.id], actualAmount: parseInt(e.target.value) || 0 },
                                }))
                              }
                              className="w-full text-right px-2 py-1 rounded text-sm outline-none"
                              style={{
                                border: `1px solid ${isEdited ? "#1C90FB" : "#E6E6E6"}`,
                                color: "#333",
                              }}
                            />
                          )}
                        </td>
                        <td className="text-right text-sm" style={{ color: "#333" }}>
                          {formatAmt(Number(b.cumulativeAmount))}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: "#F0F0F0", minWidth: 60 }}>
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  background: Number(b.progressRate) > 100 ? "#FC5356" : "#1C90FB",
                                  width: `${Math.min(Number(b.progressRate), 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium" style={{ color: "#333", minWidth: 36 }}>
                              {Number(b.progressRate).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`ct-badge ${STATUS_MAP[b.status]?.cls || "ct-badge-gray"}`}>
                            {STATUS_MAP[b.status]?.label || b.status}
                          </span>
                        </td>
                        <td>
                          {b.status !== "approved" && (
                            <button
                              onClick={() => approveMutation.mutate(b.id)}
                              disabled={approveMutation.isPending}
                              className="text-xs px-2 py-1 rounded font-medium"
                              style={{ background: "#1C90FB", color: "#fff" }}
                            >
                              승인
                            </button>
                          )}
                          {b.status === "approved" && (
                            <span className="text-xs" style={{ color: "#1DC078" }}>✓완료</span>
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
