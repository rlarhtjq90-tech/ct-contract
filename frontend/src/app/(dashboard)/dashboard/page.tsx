"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { dashboard } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Building2, FileText, AlertTriangle, PlusCircle, ChevronRight } from "lucide-react";
import { fmtMoney, fmtMoneyAxis } from "@/lib/format";

function KpiCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  icon: Icon,
  color = "#1C90FB",
  href,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: number;
  deltaLabel?: string;
  icon: any;
  color?: string;
  href?: string;
}) {
  const router = useRouter();
  const isPositive = delta !== undefined ? delta >= 0 : null;
  const isClickable = !!href;

  return (
    <div
      className="ct-card p-5 flex flex-col gap-3"
      onClick={isClickable ? () => router.push(href!) : undefined}
      style={{
        minWidth: 0,
        cursor: isClickable ? "pointer" : "default",
        transition: isClickable ? "box-shadow 0.15s, transform 0.1s" : undefined,
      }}
      onMouseEnter={isClickable ? (e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(28,144,251,0.15)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      } : undefined}
      onMouseLeave={isClickable ? (e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
        (e.currentTarget as HTMLDivElement).style.transform = "";
      } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: "#666" }}>
          {label}
        </span>
        <div className="flex items-center gap-1">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${color}15` }}
          >
            <Icon size={18} style={{ color }} />
          </div>
          {isClickable && (
            <ChevronRight size={14} style={{ color: "#BBBBBB" }} />
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold" style={{ color: "#333" }}>
          {value}
        </span>
        {unit && (
          <span className="text-sm" style={{ color: "#666" }}>
            {unit}
          </span>
        )}
      </div>

      {isClickable && (
        <div className="text-xs" style={{ color: "#1C90FB", opacity: 0.8 }}>
          클릭하여 상세 보기 →
        </div>
      )}

      {delta !== undefined && (
        <div className="flex items-center gap-1">
          {isPositive ? (
            <TrendingUp size={13} style={{ color: "#1C90FB" }} />
          ) : (
            <TrendingDown size={13} style={{ color: "#FC5356" }} />
          )}
          <span
            className="text-xs"
            style={{ color: isPositive ? "#1C90FB" : "#FC5356" }}
          >
            {Math.abs(delta)}{deltaLabel}
          </span>
          <span className="text-xs" style={{ color: "#AAA" }}>
            전월 대비
          </span>
        </div>
      )}
    </div>
  );
}

const CHART_COLORS = ["#1C90FB", "#FC5356", "#1DC078", "#F5A623", "#7B5EA7"];

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

  const kpi = summary?.kpi;

  // 차트 축: 공간 좁아 억 단위 유지 (쉼표 적용)
  const formatAmount = fmtMoneyAxis;
  // 차트 툴팁: 전체 쉼표 금액
  const formatAmountFull = (val: number) => fmtMoney(val);

  // 계약 상태 파이 차트 데이터
  const statusData = currentMonth
    ? [
        { name: "승인완료", value: currentMonth.approved },
        { name: "입력완료", value: currentMonth.submitted - currentMonth.approved },
        { name: "미입력", value: currentMonth.total - currentMonth.submitted },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div>
      <PageHeader title="메인 대시보드" subtitle="전사 계약 현황" />

      <div className="p-6 space-y-6">
        {/* KPI 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="총 도급계약"
            value={sumLoading ? "..." : kpi?.totalProjects ?? 0}
            unit="건"
            icon={Building2}
            color="#1C90FB"
            href="/projects"
          />
          <KpiCard
            label="총 하도급계약"
            value={sumLoading ? "..." : kpi?.totalSubcontracts ?? 0}
            unit="건"
            icon={FileText}
            color="#1DC078"
            href="/subcontracts"
          />
          <KpiCard
            label="전사 평균 기성률"
            value={sumLoading ? "..." : `${kpi?.weightedAvgProgress ?? 0}`}
            unit="%"
            icon={TrendingUp}
            color="#7B5EA7"
          />
          <KpiCard
            label="당월 신규 하도급"
            value={sumLoading ? "..." : kpi?.newSubcontractsThisMonth ?? 0}
            unit="건"
            icon={PlusCircle}
            color="#F5A623"
          />
          <KpiCard
            label="지연 위험"
            value={sumLoading ? "..." : kpi?.delayedCount ?? 0}
            unit="건"
            icon={AlertTriangle}
            color="#FC5356"
          />
        </div>

        {/* 차트 2x2 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 월별 기성률 추이 */}
          <div className="ct-card p-5">
            <h3
              className="text-sm font-semibold mb-4"
              style={{ color: "#333" }}
            >
              월별 기성률 추이 (12개월)
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#888" }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#888" }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(v: any) => [`${v}%`, "가중평균 기성률"]}
                  labelFormatter={(l) => `${l} 기준`}
                />
                <Line
                  type="monotone"
                  dataKey="progress"
                  stroke="#1C90FB"
                  strokeWidth={2}
                  dot={{ fill: "#1C90FB", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 도급 vs 하도급 금액 비교 */}
          <div className="ct-card p-5">
            <h3
              className="text-sm font-semibold mb-4"
              style={{ color: "#333" }}
            >
              도급 vs 하도급 금액 비교
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={comparison.slice(0, 8)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#888" }}
                  tickFormatter={(v) => formatAmount(v)}
                />
                <YAxis
                  type="category"
                  dataKey="projectCode"
                  tick={{ fontSize: 10, fill: "#666" }}
                  width={60}
                />
                <Tooltip
                  formatter={(v: any) => [formatAmountFull(Number(v)), ""]}
                />
                <Legend />
                <Bar dataKey="contractAmount" name="도급금액" fill="#1C90FB" barSize={10} />
                <Bar dataKey="subcontractTotal" name="하도급 합계" fill="#E6F5FF" barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 당월 기성 진척도 */}
          <div className="ct-card p-5">
            <h3
              className="text-sm font-semibold mb-4"
              style={{ color: "#333" }}
            >
              당월 기성 입력 진척도
            </h3>
            {currentMonth ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span style={{ color: "#666" }}>전체 {currentMonth.total}건</span>
                  <span style={{ color: "#1C90FB" }} className="font-medium">
                    승인 {currentMonth.approved}건
                  </span>
                </div>

                {[
                  { label: "승인완료", count: currentMonth.approved, total: currentMonth.total, color: "#1DC078" },
                  { label: "입력완료", count: currentMonth.submitted, total: currentMonth.total, color: "#1C90FB" },
                  { label: "이상치", count: currentMonth.anomalies, total: currentMonth.total, color: "#FC5356" },
                ].map(({ label, count, total, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1" style={{ color: "#666" }}>
                      <span>{label}</span>
                      <span>{count}/{total}건</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "#F0F0F0" }}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          background: color,
                          width: total > 0 ? `${(count / total) * 100}%` : "0%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm" style={{ color: "#AAA" }}>
                데이터를 불러오는 중...
              </div>
            )}
          </div>

          {/* 계약 상태 도넛 */}
          <div className="ct-card p-5">
            <h3
              className="text-sm font-semibold mb-4"
              style={{ color: "#333" }}
            >
              당월 기성 상태
            </h3>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(v) => <span style={{ fontSize: 12, color: "#666" }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm" style={{ color: "#AAA" }}>
                당월 기성 데이터 없음
              </div>
            )}
          </div>
        </div>

        {/* 총 계약금액 */}
        {kpi?.totalContractAmount > 0 && (
          <div
            className="ct-card p-4 flex items-center justify-between"
          >
            <span className="text-sm font-medium" style={{ color: "#666" }}>
              전체 도급 계약금액 합계
            </span>
            <span className="text-lg font-bold" style={{ color: "#1C90FB" }}>
              {formatAmount(kpi.totalContractAmount)}원
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
