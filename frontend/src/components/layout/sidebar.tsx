"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  FolderOpen,
  FileText,
  BarChart3,
  TrendingUp,
  FileBarChart,
  Bell,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { href: "/clients", icon: Building2, label: "거래처" },
  { href: "/projects", icon: FolderOpen, label: "도급계약" },
  { href: "/subcontracts", icon: FileText, label: "하도급계약" },
  { href: "/billings", icon: BarChart3, label: "기성입력" },
  { href: "/trends", icon: TrendingUp, label: "변동추이" },
  { href: "/reports", icon: FileBarChart, label: "리포트" },
  { href: "/notifications", icon: Bell, label: "알림" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{ background: "#333948", width: "200px", minHeight: "100vh" }}
      className="flex flex-col flex-shrink-0"
    >
      {/* 로고 */}
      <div
        className="flex items-center px-4 py-4 border-b"
        style={{ borderColor: "#666A74" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded font-bold text-white text-sm"
            style={{ background: "#1C90FB" }}
          >
            CT
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">계약관리</div>
            <div className="text-xs" style={{ color: "#B4BCC5" }}>시스템</div>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 py-3">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div
                className="flex items-center gap-3 mx-2 px-3 py-2 rounded cursor-pointer transition-all"
                style={{
                  background: isActive ? "#EFF7FF" : "transparent",
                  color: isActive ? "#1C90FB" : "#B4BCC5",
                  marginBottom: "2px",
                }}
              >
                <Icon size={16} />
                <span className="text-sm font-medium">{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 하단 */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "#666A74" }}>
        <div className="text-xs" style={{ color: "#666A74" }}>
          씨티이앤씨 © 2026
        </div>
      </div>
    </aside>
  );
}
