"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notifications } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Bell, AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react";

const TYPE_META: Record<string, { icon: any; color: string; label: string }> = {
  anomaly: { icon: AlertTriangle, color: "#FC5356", label: "이상치 감지" },
  billing_missing: { icon: Clock, color: "#F5A623", label: "기성 미입력" },
  review_pending: { icon: FileText, color: "#1C90FB", label: "검토 대기" },
  registration_due: { icon: Bell, color: "#7B5EA7", label: "등록 마감" },
  contract_expiry: { icon: AlertTriangle, color: "#FC5356", label: "계약 만료" },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: notifications.getAll,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notifications.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div>
      <PageHeader title="알림 센터" subtitle={`읽지 않은 알림 ${data.filter((n: any) => !n.isRead).length}건`} />
      <div className="p-6">
        <div className="ct-card divide-y" style={{ borderColor: "#F0F0F0" }}>
          {data.length === 0 ? (
            <div className="text-center py-16">
              <Bell size={40} style={{ color: "#DDD", margin: "0 auto 12px" }} />
              <div style={{ color: "#AAA" }}>알림이 없습니다.</div>
            </div>
          ) : (
            data.map((n: any) => {
              const meta = TYPE_META[n.type] || { icon: Bell, color: "#666", label: n.type };
              const Icon = meta.icon;
              return (
                <div
                  key={n.id}
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ opacity: n.isRead ? 0.6 : 1 }}
                  onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${meta.color}15` }}
                  >
                    <Icon size={15} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                      )}
                    </div>
                    <div className="text-sm font-medium" style={{ color: "#333" }}>{n.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#666" }}>{n.message}</div>
                    <div className="text-xs mt-1" style={{ color: "#AAA" }}>
                      {new Date(n.createdAt).toLocaleString("ko-KR")}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
