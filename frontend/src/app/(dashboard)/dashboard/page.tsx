"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { dashboard } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, Building2, FileText, AlertTriangle,
  PlusCircle, ChevronRight, CalendarClock, CheckCircle2,
  Layers, BarChart2,
} from "lucide-react";
import { fmtMoney, fmtMoneyAxis } from "@/lib/format";

/* ── KPI 카드 ── */
function KpiCard({
  label, value, unit, sub, icon: Icon, color = "#1C90FB", href,
}: {
  label: string; value: string | number; unit?: string; sub?: string;
  icon: any; color?: string; href?: string;
}) {
  const router = useRouter();
  return (
    <div
      className="ct-card p-4 flex flex-col gap-2"
      onClick={href ? () => router.push(href) : undefined}
      style={{ cursor: href ? "pointer" : "default", minWidth: 0 }}
      onMouseEnter={href ? (e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 14px rgba(28,144,251,0.13)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      } : undefined}
      onMouseLeave={href ? (e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
        (e.currentTarget as HTMLDivElement).style.transform = "";
      } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "#888" }}>{label}</span>
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
            <Icon size={16} style={{ color }} />
          </div>
          {href && <ChevronRight size={13} style={{ color: "#CCC" }} />}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold" style={{ color: "#222" }}>{value}</span>
        {unit && <span className="text-sm" style={{ color: "#888" }}>{unit}</span>}
      </div>
      {sub && <div className="text-xs" style={{ color: "#AAA" }}>{sub}</div>}
    </div>
  );
}

const CHART_COLORS = ["#1C90FB", "#7C3AED", "#1DC078", "#F5A623"];

export default function DashboardPage() {
  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: dashboard.getSummary,
  });
  const { data: trend = [] } = useQuery({
    queryKey: ["dashboard-trend"],
    queryFn: () => dashboard.getProgressTrend(12),
  });
  const { data: comparison = [] } = useQuery({
    queryKey: ["dashboard-comparison"],
    queryFn: dashboard.getContractComparison,
  });
  const { data: expiry } = useQuery({
    queryKey: ["dashboard-expiry"],
    queryFn: () => dashboard.getUpcomingExpiry(30),
  });
  const { data: billingComparison = [] } = useQuery({
    queryKey: ["billing-comparison"],
    queryFn: dashboard.getBillingComparison,
  });

  const kpi = summary?.kpi;
  const expiryItems = [
    ...(expiry?.projects ?? []).map((p: any) => ({ ...p, _type: "project" as const })),
    ...(expiry?.subcontracts ?? []).map((s: any) => ({ ...s, _type: "subcontract" as const })),
  ].sort((a, b) => a.daysLeft - b.daysLeft);

  const hasData = !sumLoading && (kpi?.totalProjects ?? 0) > 0;

  return (
    <div>
      <PageHeader title="메인 대시보드" subtitle="전사 계약 현황" />

      <div className="p-6 space-y-5">

        {/* ── 빈 데이터 안내 ── */}
        {!sumLoading && !hasData && (
          <div className="ct-card p-6 text-center">
            <Layers size={40} style={{ color: "#DDD", margin: "0 auto 12px" }} />
            <p className="font-medium text-sm mb-1" style={{ color: "#555" }}>등록된 계약 데이터가 없습니다</p>
            <p className="text-xs mb-4" style={{ color: "#AAA" }}>
              발주처 → 도급계약 → 하도급계약 순서로 등록하세요.
            </p>
            <div className="flex justify-center gap-2">
              {[
                { label: "발주처 등록", href: "/clients" },
                { label: "도급계약 등록", href: "/projects" },
              ].map(({ label, href }) => (
                <a key={href} href={href}
                  className="px-4 py-2 rounded text-sm font-medium"
                  style={{ background: "#F0F7FF", color: "#1C90FB" }}>
                  {label} →
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── KPI 카드 (2줄) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard label="총 도급계약" value={sumLoading ? "…" : kpi?.totalProjects ?? 0}
            unit="건" icon={Building2} color="#1C90FB" href="/projects" />
          <KpiCard label="총 하도급계약" value={sumLoading ? "…" : kpi?.totalSubcontracts ?? 0}
            unit="건" icon={FileText} color="#7C3AED" href="/subcontracts" />
          <KpiCard label="도급 총액" value={sumLoading ? "…" : fmtMoney(kpi?.totalContractAmount ?? 0)}
            icon={BarChart2} color="#1C90FB"
            sub={`하도급 ${fmtMoney(kpi?.totalSubcontractAmount ?? 0)}`} />
          <KpiCard label="하도급 비율" value={sumLoading ? "…" : `${kpi?.subRatio ?? 0}`}
            unit="%" icon={TrendingUp}
            color={kpi?.subRatio > 85 ? "#FC5356" : "#1DC078"}
            sub="도급금액 대비" />
          <KpiCard label="도급 기성 누계" value={sumLoading ? "…" : fmtMoney(kpi?.totalProjectBillingCumulative ?? 0)}
            icon={CheckCircle2} color="#F5A623"
            sub={kpi?.totalContractAmount > 0
              ? `전체 ${((kpi.totalProjectBillingCumulative / kpi.totalContractAmount) * 100).toFixed(1)}%`
              : undefined} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <KpiCard label="전사 평균 기성률" value={sumLoading ? "…" : `${kpi?.weightedAvgProgress ?? 0}`}
            unit="%" icon={TrendingUp} color="#7B5EA7" />
          <KpiCard label="당월 신규 하도급" value={sumLoading ? "…" : kpi?.newSubcontractsThisMonth ?? 0}
            unit="건" icon={PlusCircle} color="#F5A623" href="/subcontracts" />
          <KpiCard label="지연 위험" value={sumLoading ? "…" : kpi?.delayedCount ?? 0}
            unit="건" icon={AlertTriangle} color="#FC5356" />
          <KpiCard label="만료 예정 (30일)"
            value={expiryItems.length} unit="건"
            icon={CalendarClock} color={expiryItems.length > 0 ? "#FC5356" : "#888"}
            sub={expiryItems.length > 0 ? `최근 D-${expiryItems[0]?.daysLeft}` : "해당 없음"} />
        </div>

        {/* ── 도급계약별 기성현황 (테이블) ── */}
        <div className="ct-card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "#333" }}>
            도급계약별 기성현황
            <span className="ml-2 text-xs font-normal" style={{ color: "#999" }}>전체 누계 기준</span>
          </h3>

          {(billingComparison as any[]).length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: "#AAA" }}>
              확정된 기성 데이터가 없습니다.
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ borderBottom: "2px solid #F0F0F0" }}>
                  <th className="pb-2 text-left font-semibold" style={{ color: "#888" }}>도급계약명</th>
                  <th className="pb-2 text-right font-semibold pr-4" style={{ color: "#888" }}>계약금액</th>
                  <th className="pb-2 text-right font-semibold pr-4" style={{ color: "#888" }}>도급기성</th>
                  <th className="pb-2 font-semibold pr-4" style={{ color: "#888", minWidth: 180 }}>기성률 / 진행</th>
                  <th className="pb-2 text-right font-semibold pr-4" style={{ color: "#888" }}>하도급기성</th>
                  <th className="pb-2 text-center font-semibold" style={{ color: "#888" }}>Gap</th>
                </tr>
              </thead>
              <tbody>
                {(billingComparison as any[]).map((item: any) => {
                  const gapPos = item.gap >= 0;
                  return (
                    <tr key={item.projectId}
                      className="hover:bg-[#FAFAFA] transition-colors"
                      style={{ borderBottom: "1px solid #F5F5F5" }}>
                      {/* 계약명 */}
                      <td className="py-3 pr-4">
                        <span className="font-medium" style={{ color: "#333" }}>{item.projectName}</span>
                      </td>
                      {/* 계약금액 */}
                      <td className="py-3 pr-4 text-right" style={{ color: "#555" }}>
                        {fmtMoneyAxis(item.contractAmount)}
                      </td>
                      {/* 도급 누적기성 */}
                      <td className="py-3 pr-4 text-right font-medium" style={{ color: "#1C90FB" }}>
                        {fmtMoneyAxis(item.projBillingCumul)}
                      </td>
                      {/* 기성률 + 인라인 바 */}
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="w-10 text-right font-semibold flex-shrink-0" style={{ color: "#1C90FB" }}>
                            {item.projProgressRate.toFixed(1)}%
                          </span>
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: "#F0F0F0" }}>
                            <div className="h-1.5 rounded-full transition-all"
                              style={{ background: "#1C90FB", width: `${Math.min(item.projProgressRate, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      {/* 하도급기성 */}
                      <td className="py-3 pr-4 text-right font-medium" style={{ color: "#7C3AED" }}>
                        {fmtMoneyAxis(item.subBillingCumul)}
                      </td>
                      {/* Gap 배지 */}
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded font-semibold"
                          style={{
                            color: gapPos ? "#1DC078" : "#FC5356",
                            background: gapPos ? "#F0FFF8" : "#FFF0F0",
                          }}>
                          {gapPos ? "▲" : "▼"} {fmtMoneyAxis(Math.abs(item.gap))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── 차트 2개 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* 월별 기성률 추이 */}
          <div className="ct-card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#333" }}>
              월별 기성률 추이 <span className="text-xs font-normal ml-1" style={{ color: "#AAA" }}>12개월</span>
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#888" }}
                  tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }}
                  tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip formatter={(v: any) => [`${v}%`, "가중평균 기성률"]}
                  labelFormatter={(l) => `${l} 기준`} />
                <Line type="monotone" dataKey="progress" stroke="#1C90FB" strokeWidth={2}
                  dot={{ fill: "#1C90FB", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 도급 vs 하도급 금액 비교 */}
          <div className="ct-card p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#333" }}>
              도급 vs 하도급 금액 비교
            </h3>
            {(comparison as any[]).length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm" style={{ color: "#CCC" }}>
                등록된 도급계약이 없습니다.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(comparison as any[]).slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#888" }}
                    tickFormatter={(v) => fmtMoneyAxis(v)} />
                  <YAxis type="category" dataKey="name"
                    tick={{ fontSize: 10, fill: "#666" }} width={60} />
                  <Tooltip formatter={(v: any) => [fmtMoney(Number(v)), ""]} />
                  <Legend iconSize={8} />
                  <Bar dataKey="contractAmount" name="도급금액" fill="#1C90FB" barSize={10} />
                  <Bar dataKey="subcontractTotal" name="하도급합계" fill="#C5E1FF" barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
