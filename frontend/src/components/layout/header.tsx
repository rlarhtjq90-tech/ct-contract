"use client";

import { Bell, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { notifications } from "@/lib/api";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notifications.getUnreadCount().catch(() => 0),
    refetchInterval: 30000, // 30초마다 폴링
  });

  const handleLogout = () => {
    localStorage.removeItem("ct_token");
    localStorage.removeItem("ct_user");
    router.push("/login");
  };

  const userName =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("ct_user") || "{}").name || "관리자"
      : "관리자";

  return (
    <header
      className="flex items-center justify-between px-6 border-b flex-shrink-0"
      style={{
        height: "52px",
        background: "#fff",
        borderColor: "#E6E6E6",
      }}
    >
      {/* 왼쪽 - 페이지 제목 */}
      <div className="flex items-center gap-3">
        {title && (
          <h1 className="text-base font-semibold" style={{ color: "#333" }}>
            {title}
          </h1>
        )}
      </div>

      {/* 오른쪽 - 사용자 정보 */}
      <div className="flex items-center gap-4">
        <button
          className="relative p-2 rounded hover:bg-gray-100 transition-colors"
          onClick={() => router.push("/notifications")}
        >
          <Bell size={18} style={{ color: "#666" }} />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 flex items-center justify-center rounded-full text-white"
              style={{
                width: "15px",
                height: "15px",
                fontSize: "9px",
                fontWeight: 700,
                background: "#FC5356",
                lineHeight: 1,
              }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-gray-50">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium"
            style={{ background: "#1C90FB" }}
          >
            <User size={14} />
          </div>
          <span className="text-sm font-medium" style={{ color: "#333" }}>
            {userName}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm hover:bg-gray-100 transition-colors"
          style={{ color: "#666" }}
        >
          <LogOut size={15} />
          로그아웃
        </button>
      </div>
    </header>
  );
}
