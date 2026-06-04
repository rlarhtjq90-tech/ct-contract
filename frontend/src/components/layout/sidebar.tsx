"use client";

import { useState, useEffect } from "react";
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
  Archive,
  Bell,
  ChevronRight,
} from "lucide-react";

type SubItem = { href: string; icon: React.ElementType; label: string };
type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  children?: SubItem[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
  {
    href: "/projects",
    icon: FolderOpen,
    label: "도급계약",
    children: [
      { href: "/clients", icon: Building2, label: "발주처" },
      { href: "/project-billings", icon: BarChart3, label: "기성현황" },
    ],
  },
  {
    href: "/subcontracts",
    icon: FileText,
    label: "하도급계약",
    children: [
      { href: "/subcontractors", icon: Building2, label: "하도급사" },
      { href: "/billings", icon: BarChart3, label: "기성현황" },
    ],
  },
  { href: "/trends", icon: TrendingUp, label: "변동추이" },
  { href: "/reports", icon: FileBarChart, label: "리포트" },
  { href: "/snapshots", icon: Archive, label: "월별 마감" },
  { href: "/notifications", icon: Bell, label: "알림" },
];

// 각 자식 경로가 어느 부모(href)에 속하는지 미리 맵핑
const childParentMap: Record<string, string> = {
  "/clients": "/projects",
  "/project-billings": "/projects",
  "/subcontractors": "/subcontracts",
  "/billings": "/subcontracts",
};

export function Sidebar() {
  const pathname = usePathname();
  const [openParent, setOpenParent] = useState<string | null>(null);

  useEffect(() => {
    // 현재 경로가 부모 경로 자체인지 확인
    for (const item of navItems) {
      if (item.children && pathname === item.href) {
        setOpenParent(item.href);
        return;
      }
    }
    // 자식 경로인지 확인 — 맵핑 테이블로 부모 결정
    for (const [childHref, parentHref] of Object.entries(childParentMap)) {
      if (pathname === childHref || pathname.startsWith(childHref + "/")) {
        setOpenParent(parentHref);
        return;
      }
    }
    // 그 외 경로(대시보드, 변동추이 등)는 openParent를 닫음
    setOpenParent(null);
  }, [pathname]);

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
        {navItems.map((item) => {
          const { href, label, children } = item;
          const Icon = item.icon;
          const hasChildren = !!children && children.length > 0;

          // 부모 자체 경로 활성
          const selfActive =
            pathname === href ||
            (!hasChildren && href !== "/dashboard" && pathname.startsWith(href + "/"));

          // 이 부모가 펼쳐져 있는지
          const isExpanded = hasChildren && openParent === href;

          return (
            <div key={`${href}-${label}`}>
              {/* 부모 항목 */}
              <Link
                href={href}
                onClick={() => {
                  if (hasChildren) {
                    setOpenParent((prev) => (prev === href ? null : href));
                  }
                }}
              >
                <div
                  className="flex items-center gap-3 mx-2 px-3 py-2 rounded cursor-pointer transition-all"
                  style={{
                    background: selfActive ? "#EFF7FF" : "transparent",
                    color: selfActive ? "#1C90FB" : isExpanded ? "#FFFFFF" : "#B4BCC5",
                    marginBottom: "2px",
                  }}
                >
                  <Icon size={16} />
                  <span className="text-sm font-medium flex-1">{label}</span>
                  {hasChildren && (
                    <ChevronRight
                      size={13}
                      style={{
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.15s",
                        opacity: 0.7,
                      }}
                    />
                  )}
                </div>
              </Link>

              {/* 자식 항목 */}
              {hasChildren && isExpanded && (
                <div style={{ background: "#2D313E" }}>
                  {children!.map(({ href: childHref, icon: ChildIcon, label: childLabel }) => {
                    const childIsActive =
                      pathname === childHref || pathname.startsWith(childHref + "/");
                    return (
                      <Link key={childHref} href={childHref}>
                        <div
                          className="flex items-center gap-3 mx-2 pl-7 pr-3 py-2 rounded cursor-pointer transition-all"
                          style={{
                            background: childIsActive ? "#EFF7FF" : "transparent",
                            color: childIsActive ? "#1C90FB" : "#B4BCC5",
                            marginBottom: "2px",
                          }}
                        >
                          <ChildIcon size={14} />
                          <span className="text-sm font-medium">{childLabel}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
