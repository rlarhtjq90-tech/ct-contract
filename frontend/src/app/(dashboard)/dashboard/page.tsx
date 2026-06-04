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
  TrendingUp, TrendingDown, Building2, FileText, AlertTriangle,
  PlusCircle, ChevronRight, CalendarClock, Clock, CheckCircle2,
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

/* ── 기성 진척도 바 ── */
function BillingProgress({
  label, total, submitted, approved, anomalies, href, color,
}: {
  label: string; total: number; submitted: number; approved: number;
  anomalies: number; href: string; color: string;
}) {
  const router = useRouter();
  const approvedPct  = total > 0 ? (approved / total) * 100 : 0;
  const submittedPct = total > 0 ? (submitted / total) * 100 : 0;
  const pendingCount = total - submitted;

  return (
    <div
      className="flex-1 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm"
      style={{ borderColor: "#E6E6E6" }}
      onClick={() => router.push(href)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: "#333" }}>{label}</span>
        <span className="text-xs" style={{ color: "#888" }}>전체 {total}건</span>
      </div>

      {total === 0 ? (
        <div className="text-xs py-2" style={{ color: "#CCC" }}>등록된 계약 없음</div>
      ) : (
        <div className="space-y-2">
          {[
            { l: "승인완료", pct: approvedPct,  cnt: approved,  c: "#1DC078" },
            { l: "입력완료", pct: submittedPct, cnt: submitted,  c: color },
            { l: "미입력",   pct: 100 - submittedPct, cnt: pendingCount, c: "#E0E0E0" },
          ].map(({ l, pct, cnt, c }) => (
            <div key={l}>
              <div className="flex justify-between text-xs mb-0.5" style={{ color: "#888" }}>
                <span>{l}</span>
                <span style={{ color: "#555" }}>{cnt}건</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "#F0F0F0" }}>
                <div className="h-1.5 rounded-full transition-all" style={{ background: c, width: `${pct}%` }} />
              </div>
            </div>
          ))}
          {anomalies > 0 && (
            <div className="flex items-center gap-1 pt-1">
              <AlertTriangle size={11} style={{ color: "#FC5356" }} />
              <span className="text-xs" style={{ color: "#FC5356" }}>이상치 {anomalies}건</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 만료 예정 행 ── */
function ExpiryRow({ item, type }: { item: any; type: "project" | "subcontract" }) {
  const isUrgent = item.daysLeft <= 7;
  const color = isUrgent ? "#FC5356" : item.daysLeft <= 14 ? "#F5A623" : "#888";
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: "#F4F4F4" }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate" style={{ color: "#333" }}>
          {type === "project" ? item.name : item.subcontractorName}
        </div>
        <div className="text-xs truncate" style={{ color: "#AAA" }}>
          {type === "project" ? item.clientName : item.projectName}
        </div>
      </div>
      <div className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0"
        style={{ background: isUrgent ? "#FFF0F0" : "#FFF8EC", color }}>
        D-{item.daysLeft}
      </div>
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
  const { data: currentMonth } = useQuery({
    queryKey: ["dashboard-current-month"],
    queryFn: dashboard.getCurrentMonth,
  });
  const { data: expiry } = useQuery({
    queryKey: ["dashboard-expiry"],
    queryFn: () => dashboard.getUpcomingExpiry(30),
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

        {/* ── 당월 기성 현황 + 만료 예정 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* 당월 기성 진척도 */}
          <div className="ct-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#333" }}>
              당월 기성 입력 현황
              <span className="ml-2 text-xs font-normal" style={{ color: "#AAA" }}>
                {currentMonth?.month}
              </span>
            </h3>
            <div className="flex gap-4">
              <BillingProgress
                label="도급 기성"
                total={currentMonth?.proj?.total ?? 0}
                submitted={currentMonth?.proj?.submitted ?? 0}
                approved={currentMonth?.proj?.approved ?? 0}
                anomalies={currentMonth?.proj?.anomalies ?? 0}
                href="/project-billings"
                color="#1C90FB"
              />
              <BillingProgress
                label="하도급 기성"
                total={currentMonth?.sub?.total ?? 0}
                submitted={currentMonth?.sub?.submitted ?? 0}
                approved={currentMonth?.sub?.approved ?? 0}
                anomalies={currentMonth?.sub?.anomalies ?? 0}
                href="/billings"
                color="#7C3AED"
              />
            </div>
          </div>

          {/* 만료 예정 */}
          <div className="ct-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "#333" }}>
                만료 예정 <span className="text-xs font-normal ml-1" style={{ color: "#AAA" }}>30일 이내</span>
              </h3>
              {expiryItems.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ background: "#FFF0F0", color: "#FC5356" }}>
                  {expiryItems.length}건
                </span>
              )}
            </div>
            {expiryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Clock size={28} style={{ color: "#DDD" }} />
                <span className="text-xs" style={{ color: "#AAA" }}>만료 예정 계약 없음</span>
              </div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                {expiryItems.map((item) => (
                  <ExpiryRow key={`${item._type}-${item.id}`} item={item} type={item._type} />
                ))}
              </div>
            )}
          </div>
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
                  <YAxis type="category" dataKey="projectCode"
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
