"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { contractChanges } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { GitBranch } from "lucide-react";
import { fmtMoney } from "@/lib/format";

type TabType = "all" | "project" | "subcontract";

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function DeltaCell({ delta }: { delta: number }) {
  if (delta === 0)
    return <span style={{ color: "#AAA" }}>—</span>;
  const pos = delta > 0;
  return (
    <span style={{ color: pos ? "#1C90FB" : "#FC5356", fontWeight: 600 }}>
      {pos ? "+" : ""}
      {fmtMoney(delta)}
    </span>
  );
}

export default function TrendsPage() {
  const [tab, setTab] = useState<TabType>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["contract-changes"],
    queryFn: contractChanges.getAll,
  });

  const items = data as any[];

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((item) => item.targetType === tab);
  }, [items, tab]);

  const projectCount = items.filter((i) => i.targetType === "project").length;
  const subcontractCount = items.filter((i) => i.targetType === "subcontract").length;

  return (
    <div>
      <PageHeader
        title="변동추이"
        subtitle={`변경계약 ${items.length}건`}
      />
      <div className="p-6">
        {/* Tab filter */}
        <div className="flex gap-2 mb-5">
          {[
            { key: "all" as TabType, label: "전체", count: items.length },
            { key: "project" as TabType, label: "도급계약", count: projectCount },
            { key: "subcontract" as TabType, label: "하도급계약", count: subcontractCount },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                background: tab === key ? "#1C90FB" : "#F5F5F5",
                color: tab === key ? "#fff" : "#666",
              }}
            >
              {label}
              <span
                className="ml-1.5 text-xs"
                style={{ opacity: tab === key ? 0.85 : 0.7 }}
              >
                ({count})
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div
            className="ct-card py-20 text-center text-sm"
            style={{ color: "#AAA" }}
          >
            불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="ct-card flex flex-col items-center justify-center py-20">
            <GitBranch size={48} style={{ color: "#DDD", marginBottom: 16 }} />
            <div
              className="text-base font-medium"
              style={{ color: "#666" }}
            >
              변동 이력이 없습니다
            </div>
            <div className="text-sm mt-2" style={{ color: "#AAA" }}>
              도급/하도급 계약에서 변경계약을 등록하면 여기에 표시됩니다.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((item: any) => {
              const isProject = item.targetType === "project";
              const delta = item.currentAmount - item.originalAmount;
              const deltaRate =
                item.originalAmount > 0
                  ? ((delta / item.originalAmount) * 100).toFixed(1)
                  : "0.0";

              return (
                <div
                  key={`${item.targetType}-${item.targetId}`}
                  className="ct-card overflow-hidden"
                >
                  {/* Card header */}
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: "1px solid #F0F0F0" }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: isProject ? "#EBF5FF" : "#F3EEFF",
                          color: isProject ? "#1C90FB" : "#7C3AED",
                        }}
                      >
                        {isProject ? "도급" : "하도급"}
                      </span>
                      <span className="font-semibold text-sm">
                        {item.targetName}
                      </span>
                      <span className="text-xs" style={{ color: "#999" }}>
                        {item.relatedName}
                      </span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: "#CCC" }}>
                      {item.targetCode}
                    </span>
                  </div>

                  {/* Amount summary bar */}
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 text-sm"
                    style={{
                      borderBottom: "1px solid #F0F0F0",
                      background: "#FAFAFA",
                    }}
                  >
                    <span className="text-xs" style={{ color: "#999" }}>
                      원계약
                    </span>
                    <span className="font-medium" style={{ color: "#555" }}>
                      {fmtMoney(item.originalAmount)}
                    </span>
                    <span style={{ color: "#CCC", fontSize: 16 }}>→</span>
                    <span className="text-xs" style={{ color: "#999" }}>
                      현재
                    </span>
                    <span className="font-semibold" style={{ color: "#222" }}>
                      {fmtMoney(item.currentAmount)}
                    </span>
                    <span className="ml-1">
                      <DeltaCell delta={delta} />
                    </span>
                    <span
                      className="text-xs"
                      style={{
                        color:
                          delta > 0 ? "#1C90FB" : delta < 0 ? "#FC5356" : "#AAA",
                      }}
                    >
                      ({delta >= 0 ? "+" : ""}
                      {deltaRate}%)
                    </span>
                    <span
                      className="ml-auto text-xs"
                      style={{ color: "#BBB" }}
                    >
                      총 {item.changeCount}회 변경
                    </span>
                  </div>

                  {/* Changes table */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #F4F4F4" }}>
                        <th
                          className="px-4 py-2 text-left font-medium"
                          style={{ color: "#BBB", width: 64 }}
                        >
                          차수
                        </th>
                        <th
                          className="px-4 py-2 text-left font-medium"
                          style={{ color: "#BBB", width: 100 }}
                        >
                          변경일
                        </th>
                        <th
                          className="px-4 py-2 text-right font-medium"
                          style={{ color: "#BBB" }}
                        >
                          변경전
                        </th>
                        <th
                          className="px-4 py-2 text-center font-medium"
                          style={{ color: "#BBB", width: 160 }}
                        >
                          변경액
                        </th>
                        <th
                          className="px-4 py-2 text-right font-medium"
                          style={{ color: "#BBB" }}
                        >
                          변경후
                        </th>
                        <th
                          className="px-4 py-2 text-left font-medium"
                          style={{ color: "#BBB" }}
                        >
                          사유
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.changes.map((change: any, idx: number) => (
                        <tr
                          key={change.id}
                          style={{
                            borderBottom:
                              idx < item.changes.length - 1
                                ? "1px solid #F8F8F8"
                                : "none",
                          }}
                        >
                          <td
                            className="px-4 py-2.5 font-semibold"
                            style={{ color: "#555" }}
                          >
                            {change.changeNo}차
                          </td>
                          <td
                            className="px-4 py-2.5"
                            style={{ color: "#777" }}
                          >
                            {fmtDate(change.effectiveDate)}
                          </td>
                          <td
                            className="px-4 py-2.5 text-right"
                            style={{ color: "#777" }}
                          >
                            {fmtMoney(change.beforeAmount)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <DeltaCell delta={change.deltaAmount} />
                          </td>
                          <td
                            className="px-4 py-2.5 text-right font-medium"
                            style={{ color: "#333" }}
                          >
                            {fmtMoney(change.afterAmount)}
                          </td>
                          <td
                            className="px-4 py-2.5"
                            style={{ color: "#666" }}
                          >
                            {change.reason || (
                              <span style={{ color: "#CCC" }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
