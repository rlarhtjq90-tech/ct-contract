"use client";

import { PageHeader } from "@/components/layout/page-header";
import { FileBarChart } from "lucide-react";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="월간 리포트" subtitle="Phase 5 구현 예정" />
      <div className="p-6">
        <div className="ct-card flex flex-col items-center justify-center py-20">
          <FileBarChart size={48} style={{ color: "#DDD", marginBottom: 16 }} />
          <div className="text-base font-medium" style={{ color: "#666" }}>월간 리포트 자동 생성</div>
          <div className="text-sm mt-2" style={{ color: "#AAA" }}>
            PDF 자동 생성, 임원 보고용 뷰 — Phase 5에서 구현됩니다.
          </div>
        </div>
      </div>
    </div>
  );
}
