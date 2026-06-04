"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { snapshots } from "@/lib/api";
import { useIsAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import {
  Archive, Plus, Trash2, ChevronDown, ChevronRight,
  Building2, FileText,
} from "lucide-react";

function fmtMoney(n: number) {
  if (!n) return "0";
  if (Math.abs(n) >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(1)}억`;
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(0)}만`;
  return n.toLocaleString("ko-KR");
}

function fmtMoneyFull(n: number) {
  return n ? n.toLocaleString("ko-KR") + "원" : "0원";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABELS: Record<string, string> = {
  active: "진행",
  completed: "완료",
  suspended: "중단",
  cancelled: "취소",
};

const STATUS_COLORS: Record<string, string> = {
  active: "ct-badge-blue",
  completed: "ct-badge-green",
  suspended: "ct-badge-gray",
  cancelled: "ct-badge-red",
};

/* ── 스냅샷 상세 모달 ── */
function SnapshotDetailModal({
  snap,
  onClose,
}: {
  snap: any;
  onClose: () => void;
}) {
  const [expandedProj, setExpandedProj] = useState<number | null>(null);
  const data = snap.metricsJson;
  const summary = data?.summary ?? {};
  const projects: any[] = data?.projects ?? [];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-xl flex flex-col"
        style={{
          width: "min(960px, 95vw)",
          maxHeight: "90vh",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#E6E6E6" }}>
          <div>
            <h3 className="font-semibold text-base" style={{ color: "#333" }}>
              {snap.snapshotMonth} 마감 상세
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#AAA" }}>
              생성: {fmtDate(snap.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F5F5F5] text-lg"
            style={{ color: "#888" }}
          >
            ×
          </button>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b" style={{ borderColor: "#F0F0F0" }}>
          {[
            { label: "도급 총액", value: fmtMoney(summary.totalProjectAmount), sub: `${summary.projectCount}건` },
            { label: "하도급 총액", value: fmtMoney(summary.totalSubcontractAmount), sub: `${summary.subcontractCount}건` },
            { label: "당월 도급 기성", value: fmtMoney(summary.totalProjectBilling), sub: "실적" },
          ].map((c) => (
            <div key={c.label} className="ct-card p-4">
              <p className="text-xs mb-1" style={{ color: "#888" }}>{c.label}</p>
              <p className="text-lg font-bold" style={{ color: "#333" }}>{c.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#AAA" }}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* 도급계약 목록 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs font-semibold mb-3" style={{ color: "#888" }}>도급계약 목록</p>
          <div className="space-y-2">
            {projects.length === 0 && (
              <div className="text-center py-8" style={{ color: "#AAA" }}>등록된 도급계약이 없습니다.</div>
            )}
            {projects.map((p: any) => {
              const isExp = expandedProj === p.id;
              return (
                <div key={p.id} className="border rounded-lg overflow-hidden" style={{ borderColor: "#E6E6E6" }}>
                  {/* 도급계약 행 */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[#F9FBFF]"
                    onClick={() => setExpandedProj(isExp ? null : p.id)}
                  >
                    <span style={{ color: "#1C90FB" }}>
                      {isExp ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </span>
                    <Building2 size={14} style={{ color: "#1C90FB", flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm" style={{ color: "#333" }}>{p.name}</span>
                      <span className="text-xs ml-2" style={{ color: "#888" }}>{p.clientName}</span>
                    </div>
                    <span className={`ct-badge ${STATUS_COLORS[p.status] ?? "ct-badge-gray"}`}>
                      {STATUS_LABELS[p.status] ?? p.status}
                    </span>
                    <div className="text-right text-xs" style={{ minWidth: 140 }}>
                      <div className="font-medium" style={{ color: "#333" }}>{fmtMoney(p.currentAmount)}</div>
                      {p.currentAmount !== p.contractAmount && (
                        <div style={{ color: "#AAA" }}>원계약 {fmtMoney(p.contractAmount)}</div>
                      )}
                    </div>
                    <div className="text-right text-xs" style={{ minWidth: 100 }}>
                      <div style={{ color: "#555" }}>기성 {fmtMoney(p.billingAmount)}</div>
                      <div style={{ color: "#AAA" }}>누계 {fmtMoney(p.billingCumulative)}</div>
                    </div>
                    <div className="text-right text-xs font-medium" style={{ minWidth: 50, color: "#1C90FB" }}>
                      {p.billingProgress.toFixed(1)}%
                    </div>
                  </div>

                  {/* 하도급계약 목록 */}
                  {isExp && (
                    <div style={{ background: "#F9FBFF", borderTop: "1px solid #EFF4FF" }}>
                      {p.subcontracts.length === 0 ? (
                        <div className="px-10 py-3 text-xs" style={{ color: "#AAA" }}>하도급계약 없음</div>
                      ) : (
                        p.subcontracts.map((s: any) => (
                          <div
                            key={s.id}
                            className="flex items-center gap-3 px-10 py-2.5 border-b last:border-b-0"
                            style={{ borderColor: "#E9F0FF" }}
                          >
                            <FileText size={13} style={{ color: "#7C3AED", flexShrink: 0 }} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm" style={{ color: "#555" }}>{s.subcontractorName}</span>
                              {s.workScope && (
                                <span className="text-xs ml-2" style={{ color: "#AAA" }}>{s.workScope}</span>
                              )}
                            </div>
                            <div className="text-right text-xs" style={{ minWidth: 140 }}>
                              <div className="font-medium" style={{ color: "#555" }}>{fmtMoney(s.currentAmount)}</div>
                              {s.currentAmount !== s.contractAmount && (
                                <div style={{ color: "#AAA" }}>원계약 {fmtMoney(s.contractAmount)}</div>
                              )}
                            </div>
                            <div className="text-right text-xs" style={{ minWidth: 100 }}>
                              <div style={{ color: "#888" }}>기성 {fmtMoney(s.billingAmount)}</div>
                              <div style={{ color: "#AAA" }}>누계 {fmtMoney(s.billingCumulative)}</div>
                            </div>
                            <div className="text-right text-xs font-medium" style={{ minWidth: 50, color: "#7C3AED" }}>
                              {s.billingProgress.toFixed(1)}%
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 페이지 ── */
export default function SnapshotsPage() {
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();

  const [createMonth, setCreateMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [detailSnap, setDetailSnap] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["snapshots"],
    queryFn: snapshots.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (month: string) => snapshots.create(month),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["snapshots"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (month: string) => snapshots.delete(month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      setDeleteConfirm(null);
    },
  });

  // 스냅샷 목록에서 이미 마감된 월 목록
  const snappedMonths = new Set((data as any[]).map((s) => s.snapshotMonth));

  return (
    <div>
      <PageHeader
        title="월별 마감"
        subtitle="기성 및 계약 현황을 월별로 동결·보관합니다"
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={createMonth}
                onChange={(e) => setCreateMonth(e.target.value)}
                className="px-2 py-1.5 rounded text-sm outline-none"
                style={{ border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.15)", color: "#fff" }}
              />
              <button
                onClick={() => createMutation.mutate(createMonth)}
                disabled={createMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                <Plus size={14} />
                {snappedMonths.has(createMonth) ? "재마감" : "마감 생성"}
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="p-6">
        {createMutation.isSuccess && (
          <div className="mb-4 px-4 py-2.5 rounded-lg text-sm"
            style={{ background: "#F0FFF8", border: "1px solid #A8E6C4", color: "#1DC078" }}>
            ✓ {createMonth} 마감 스냅샷이 생성되었습니다.
          </div>
        )}
        {createMutation.isError && (
          <div className="mb-4 px-4 py-2.5 rounded-lg text-sm"
            style={{ background: "#FFF0F0", border: "1px solid #FFCCCC", color: "#FC5356" }}>
            ✗ 마감 생성 실패: {(createMutation.error as any)?.message}
          </div>
        )}

        <div className="ct-card overflow-hidden">
          <table className="ct-table">
            <thead>
              <tr>
                <th>마감 월</th>
                <th className="text-center">도급 건수</th>
                <th className="text-right">도급 총액</th>
                <th className="text-center">하도급 건수</th>
                <th className="text-right">하도급 총액</th>
                <th className="text-right">당월 도급 기성</th>
                <th className="text-right">당월 하도급 기성</th>
                <th>생성일시</th>
                <th style={{ width: 120 }}>비고</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12" style={{ color: "#AAA" }}>
                    불러오는 중...
                  </td>
                </tr>
              ) : (data as any[]).length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-14">
                    <Archive size={36} style={{ color: "#DDD", margin: "0 auto 10px" }} />
                    <div style={{ color: "#AAA", fontSize: 13 }}>생성된 마감 스냅샷이 없습니다.</div>
                    {isAdmin && (
                      <div className="mt-2 text-xs" style={{ color: "#BBB" }}>
                        상단 "마감 생성" 버튼으로 월별 현황을 동결하세요.
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                (data as any[]).map((snap: any) => {
                  const s = snap.metricsJson?.summary ?? {};
                  return (
                    <tr key={snap.snapshotMonth}>
                      <td>
                        <span className="font-semibold" style={{ color: "#333" }}>{snap.snapshotMonth}</span>
                      </td>
                      <td className="text-center">
                        <span className="ct-badge ct-badge-blue">{s.projectCount ?? 0}건</span>
                      </td>
                      <td className="text-right font-medium" style={{ color: "#333" }}>
                        {fmtMoney(s.totalProjectAmount ?? 0)}
                      </td>
                      <td className="text-center">
                        <span className="ct-badge ct-badge-purple">{s.subcontractCount ?? 0}건</span>
                      </td>
                      <td className="text-right font-medium" style={{ color: "#333" }}>
                        {fmtMoney(s.totalSubcontractAmount ?? 0)}
                      </td>
                      <td className="text-right" style={{ color: "#555" }}>
                        {fmtMoney(s.totalProjectBilling ?? 0)}
                      </td>
                      <td className="text-right" style={{ color: "#555" }}>
                        {fmtMoney(s.totalSubcontractBilling ?? 0)}
                      </td>
                      <td style={{ color: "#888", fontSize: 12 }}>
                        {fmtDate(snap.createdAt)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetailSnap(snap)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-[#F5F5F5]"
                            style={{ color: "#1C90FB" }}
                          >
                            상세
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteConfirm(snap)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-[#F5F5F5]"
                              style={{ color: "#FC5356" }}
                            >
                              <Trash2 size={11} />삭제
                            </button>
                          )}
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

      {/* 상세 모달 */}
      {detailSnap && (
        <SnapshotDetailModal
          snap={detailSnap}
          onClose={() => setDetailSnap(null)}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#FFF0F0" }}>
                <Trash2 size={18} style={{ color: "#FC5356" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#333" }}>스냅샷 삭제</p>
                <p className="text-xs mt-0.5" style={{ color: "#888" }}>삭제하면 복구할 수 없습니다.</p>
              </div>
            </div>
            <p className="text-sm mb-5" style={{ color: "#555" }}>
              <span className="font-medium" style={{ color: "#FC5356" }}>{deleteConfirm.snapshotMonth}</span> 마감 스냅샷을 삭제하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 rounded text-sm ct-btn-secondary">취소</button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm.snapshotMonth)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 rounded text-sm text-white font-medium"
                style={{ background: "#FC5356" }}
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
