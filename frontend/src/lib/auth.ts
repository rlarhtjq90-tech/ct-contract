"use client";

import { useMemo } from "react";

export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  role: "admin" | "pm" | "viewer";
}

/** localStorage의 ct_user를 파싱해 반환합니다. */
export function useUser(): CurrentUser | null {
  return useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("ct_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);
}

/** 현재 로그인 유저가 admin인지 여부 */
export function useIsAdmin(): boolean {
  const user = useUser();
  return user?.role === "admin";
}

/** admin 또는 pm — 등록·변경 가능 여부 */
export function useCanEdit(): boolean {
  const user = useUser();
  return user?.role === "admin" || user?.role === "pm";
}
