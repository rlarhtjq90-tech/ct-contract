import { redirect } from "next/navigation";

// 루트 → 대시보드로 리디렉트
export default function RootPage() {
  redirect("/dashboard");
}
