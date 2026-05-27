"use client";

import { PageHeader } from "@/components/layout/page-header";
import { TrendingUp } from "lucide-react";

export default function TrendsPage() {
  return (
    <div>
      <PageHeader title="월간 변동 추이" subtitle="Phase 5 구현 예정" />
      <div className="p-6">
        <div className="ct-card flex flex-col items-center justify-center py-20">
          <TrendingUp size={48} style={{ color: "#DDD", marginBottom: 16 }} />
          <div className="text-base font-medium" style={{ color: "#666" }}>월간 변동 추이 분석</div>
          <div className="text-sm mt-2" style={{ color: "#AAA" }}>
            스냅샷 슬라이더, 전월 대비 증감, 히트맵 — Phase 5에서 구현됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
