"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reports } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { ChevronDown, ChevronRight, Building2, FolderOpen, Users, Download } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { exportReports } from "@/lib/excel";

const STATUS_LABEL: Record<string, string> = {
  active: "진행중", completed: "완료", suspended: "일시중단", cancelled: "취소",
};
const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  active:    { bg: "#EBF5FF", color: "#1C90FB" },
  completed: { bg: "#EDFBF3", color: "#27AE60" },
  suspended: { bg: "#FFF8EC", color: "#F5A623" },
  cancelled: { bg: "#F5F5F5", color: "#999" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLOR[status] ?? { bg: "#F5F5F5", color: "#999" };
  return (
    <span className="text-xs font-medium px-1.5 py-0.5 rounded"
          style={{ background: s.bg, color: s.color }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function ProgressBar({ rate }: { rate: number }) {
  const pct = Math.min(100, Math.max(0, rate));
  const color = pct >= 80 ? "#27AE60" : pct >= 40 ? "#1C90FB" : "#F5A623";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full" style={{ background: "#EBEBEB" }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs" style={{ color, minWidth: 36 }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="ct-card px-5 py-4 flex flex-col gap-1">
      <div className="text-xs font-medium" style={{ color: "#999" }}>{label}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: "#AAA" }}>{sub}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data = [], isLoading } = useQuery({
    queryKey: ["reports-overview"],
    queryFn: reports.getOverview,
  });

  const clientGroups = data as any[];

  // 전체 요약 집계
  const allProjects = clientGroups.flatMap((g: any) => g.projects ?? []);
  const allSubs = allProjects.flatMap((p: any) => p.subcontracts ?? []);
  const totalProjAmount = allProjects.reduce((s: number, p: any) => s + p.currentAmount, 0);
  const totalSubAmount = allSubs.reduce((s: number, sub: any) => s + sub.currentAmount, 0);
  const totalProjBilling = allProjects.reduce((s: number, p: any) => s + p.billingCumulative, 0);
  const overallSubRatio = totalProjAmount > 0
    ? ((totalSubAmount / totalProjAmount) * 100).toFixed(1)
    : "0.0";

  function toggle(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="종합 계약 현황"
        subtitle={`발주처 ${clientGroups.length}곳 · 도급계약 ${allProjects.length}건`}
        actions={
          clientGroups.length > 0 ? (
            <button
              onClick={() => exportReports(clientGroups)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <Download size={14} />
              엑셀 내보내기
            </button>
          ) : undefined
        }
      />
      <div className="p-6 flex flex-col gap-5">

        {/* Summary KPI */}
        <div className="grid grid-cols-4 gap-4">
          <SummaryCard
            label="도급계약 총액"
            value={fmtMoney(totalProjAmount)}
            sub={`${allProjects.length}건`}
            color="#1C90FB"
          />
          <SummaryCard
            label="하도급계약 총액"
            value={fmtMoney(totalSubAmount)}
            sub={`${allSubs.length}건`}
            color="#7C3AED"
          />
          <SummaryCard
            label="하도급 비율"
            value={`${overallSubRatio}%`}
            sub="도급계약금액 대비"
            color={Number(overallSubRatio) > 80 ? "#FC5356" : "#27AE60"}
          />
          <SummaryCard
            label="도급 기성 누계"
            value={fmtMoney(totalProjBilling)}
            sub={totalProjAmount > 0
              ? `전체 기성률 ${((totalProjBilling / totalProjAmount) * 100).toFixed(1)}%`
              : ""}
            color="#F5A623"
          />
        </div>

        {/* Client-grouped tables */}
        {isLoading ? (
          <div className="ct-card py-16 text-center text-sm" style={{ color: "#AAA" }}>
            불러오는 중...
          </div>
        ) : clientGroups.length === 0 ? (
          <div className="ct-card py-16 text-center">
            <Building2 size={40} style={{ color: "#DDD", margin: "0 auto 12px" }} />
            <div style={{ color: "#AAA" }}>등록된 계약이 없습니다.</div>
          </div>
        ) : (
          clientGroups.map((group: any) => {
            const groupProjAmt = group.projects.reduce((s: number, p: any) => s + p.currentAmount, 0);
            const groupSubAmt = group.projects.reduce((s: number, p: any) => s + p.subTotal, 0);

            return (
              <div key={group.client.id} className="ct-card overflow-hidden">
                {/* Client header */}
                <div className="flex items-center gap-3 px-4 py-3"
                     style={{ background: "#F7F8FA", borderBottom: "1px solid #EBEBEB" }}>
                  <Building2 size={14} style={{ color: "#888" }} />
                  <span className="font-semibold text-sm" style={{ color: "#333" }}>
                    {group.client.name}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: "#EBEBEB", color: "#777" }}>
                    도급 {group.projects.length}건
                  </span>
                  <span className="ml-auto text-xs" style={{ color: "#888" }}>
                    도급 {fmtMoney(groupProjAmt)}
                    <span className="mx-1.5" style={{ color: "#CCC" }}>|</span>
                    하도급 {fmtMoney(groupSubAmt)}
                  </span>
                </div>

                {/* Projects */}
                {group.projects.map((proj: any) => {
                  const isOpen = expanded.has(proj.id);
                  return (
                    <div key={proj.id}>
                      {/* Project row */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        style={{ borderBottom: "1px solid #F4F4F4" }}
                        onClick={() => toggle(proj.id)}
                      >
                        <button className="flex-shrink-0" style={{ color: "#BBB" }}>
                          {isOpen
                            ? <ChevronDown size={14} />
                            : <ChevronRight size={14} />}
                        </button>
                        <FolderOpen size={13} style={{ color: "#1C90FB", flexShrink: 0 }} />

                        {/* 계약명 */}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm" style={{ color: "#222" }}>
                            {proj.name}
                          </span>
                          {proj.changeCount > 0 && (
                            <span className="ml-2 text-xs px-1 py-0.5 rounded"
                                  style={{ background: "#F0F7FF", color: "#1C90FB" }}>
                              변경 {proj.changeCount}회
                            </span>
                          )}
                        </div>

                        <StatusBadge status={proj.status} />

                        {/* 도급 금액 */}
                        <div className="text-right" style={{ minWidth: 130 }}>
                          <div className="text-xs" style={{ color: "#AAA" }}>원계약</div>
                          <div className="text-xs font-medium" style={{ color: "#555" }}>
                            {fmtMoney(proj.originalAmount)}
                          </div>
                        </div>
                        <div className="text-right" style={{ minWidth: 130 }}>
                          <div className="text-xs" style={{ color: "#AAA" }}>현계약</div>
                          <div className="text-sm font-semibold" style={{ color: "#222" }}>
                            {fmtMoney(proj.currentAmount)}
                          </div>
                        </div>

                        {/* 도급 기성 */}
                        <div className="text-right" style={{ minWidth: 130 }}>
                          <div className="text-xs" style={{ color: "#AAA" }}>기성누계</div>
                          <div className="text-xs font-medium" style={{ color: "#F5A623" }}>
                            {fmtMoney(proj.billingCumulative)}
                          </div>
                        </div>
                        <div style={{ minWidth: 100 }}>
                          <ProgressBar rate={proj.billingProgress} />
                        </div>

                        {/* 하도급 합계 */}
                        <div className="text-right" style={{ minWidth: 120 }}>
                          <div className="text-xs" style={{ color: "#AAA" }}>하도급합계</div>
                          <div className="text-xs font-medium" style={{ color: "#7C3AED" }}>
                            {fmtMoney(proj.subTotal)}
                          </div>
                        </div>
                        <div className="text-xs text-right" style={{ minWidth: 52, color: "#999" }}>
                          {proj.subRatio.toFixed(1)}%
                        </div>
                      </div>

                      {/* Subcontracts (expanded) */}
                      {isOpen && proj.subcontracts.length > 0 && (
                        <div style={{ background: "#FAFAFA" }}>
                          {/* Subcontract header */}
                          <div className="flex items-center gap-3 px-4 py-1.5"
                               style={{ borderBottom: "1px solid #F0F0F0" }}>
                            <div style={{ width: 17 }} />
                            <Users size={11} style={{ color: "#AAA", flexShrink: 0 }} />
                            <div className="flex-1 text-xs font-medium" style={{ color: "#AAA" }}>하도급사</div>
                            <div className="text-xs font-medium" style={{ color: "#AAA", minWidth: 80 }}>상태</div>
                            <div className="text-xs font-medium text-right" style={{ color: "#AAA", minWidth: 130 }}>원계약</div>
                            <div className="text-xs font-medium text-right" style={{ color: "#AAA", minWidth: 130 }}>현계약</div>
                            <div className="text-xs font-medium text-right" style={{ color: "#AAA", minWidth: 130 }}>기성누계</div>
                            <div className="text-xs font-medium" style={{ color: "#AAA", minWidth: 100 }}>기성률</div>
                            <div style={{ minWidth: 120 }} />
                            <div style={{ minWidth: 52 }} />
                          </div>

                          {proj.subcontracts.map((sub: any) => (
                            <div key={sub.id}
                                 className="flex items-center gap-3 px-4 py-2.5"
                                 style={{ borderBottom: "1px solid #F0F0F0" }}>
                              <div style={{ width: 17 }} />
                              <div className="w-2 h-2 rounded-full flex-shrink-0"
                                   style={{ background: STATUS_COLOR[sub.status]?.color ?? "#AAA", opacity: 0.7 }} />

                              <div className="flex-1 min-w-0">
                                <span className="text-sm" style={{ color: "#444" }}>
                                  {sub.subcontractorName}
                                </span>
                                {sub.changeCount > 0 && (
                                  <span className="ml-1.5 text-xs px-1 py-0.5 rounded"
                                        style={{ background: "#F3EEFF", color: "#7C3AED" }}>
                                    변경 {sub.changeCount}회
                                  </span>
                                )}
                              </div>

                              <div style={{ minWidth: 80 }}>
                                <StatusBadge status={sub.status} />
                              </div>

                              <div className="text-xs text-right" style={{ color: "#777", minWidth: 130 }}>
                                {fmtMoney(sub.originalAmount)}
                              </div>
                              <div className="text-xs font-medium text-right" style={{ color: "#444", minWidth: 130 }}>
                                {fmtMoney(sub.currentAmount)}
                              </div>
                              <div className="text-xs font-medium text-right" style={{ color: "#F5A623", minWidth: 130 }}>
                                {fmtMoney(sub.billingCumulative)}
                              </div>
                              <div style={{ minWidth: 100 }}>
                                <ProgressBar rate={sub.billingProgress} />
                              </div>
                              <div style={{ minWidth: 120 }} />
                              <div style={{ minWidth: 52 }} />
                            </div>
                          ))}
                        </div>
                      )}

                      {isOpen && proj.subcontracts.length === 0 && (
                        <div className="px-12 py-3 text-xs" style={{ color: "#CCC", background: "#FAFAFA", borderBottom: "1px solid #F4F4F4" }}>
                          등록된 하도급계약이 없습니다.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
