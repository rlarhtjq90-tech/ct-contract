"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@ct.co.kr");
  const [password, setPassword] = useState("ct1234!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await auth.login(email, password);
      localStorage.setItem("ct_token", res.accessToken);
      localStorage.setItem("ct_user", JSON.stringify(res.user));
      router.push("/");
    } catch (err: any) {
      setError(err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#F6F8FA" }}>
      {/* 왼쪽 - CT 브랜드 */}
      <div
        className="hidden lg:flex flex-col items-center justify-center w-1/2"
        style={{ background: "#333948" }}
      >
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl text-white text-3xl font-bold mb-6"
            style={{ background: "#1C90FB" }}
          >
            CT
          </div>
          <h1 className="text-white text-3xl font-bold mb-3">계약관리시스템</h1>
          <p style={{ color: "#B4BCC5" }} className="text-base">
            주식회사 씨티이앤씨
          </p>
          <p style={{ color: "#666A74" }} className="text-sm mt-2">
            하도급계약 · 기성 · 대시보드 통합 관리
          </p>
        </div>

        {/* 특징 요약 */}
        <div className="mt-16 space-y-4 w-72">
          {[
            "발주처-원청-하도급 3계층 계약 관리",
            "월별 기성 자동 재계산 및 가중평균",
            "실시간 대시보드 · 이상치 자동 감지",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "#1C90FB" }}
              />
              <span className="text-sm" style={{ color: "#B4BCC5" }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽 - 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div
          className="w-full max-w-sm rounded-xl p-8"
          style={{
            background: "#fff",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
          <div className="mb-8">
            <h2
              className="text-xl font-bold mb-1"
              style={{ color: "#333" }}
            >
              로그인
            </h2>
            <p className="text-sm" style={{ color: "#666" }}>
              계정 정보를 입력하세요
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#333" }}
              >
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  border: "1px solid #E6E6E6",
                  color: "#333",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "#1C90FB")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "#E6E6E6")
                }
                placeholder="이메일 주소 입력"
                required
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#333" }}
              >
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  border: "1px solid #E6E6E6",
                  color: "#333",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "#1C90FB")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "#E6E6E6")
                }
                placeholder="비밀번호 입력"
                required
              />
            </div>

            {error && (
              <div
                className="px-3 py-2.5 rounded-lg text-sm"
                style={{
                  background: "#FFF0F0",
                  color: "#FC5356",
                  border: "1px solid #FFD6D7",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm transition-colors"
              style={{
                background: loading ? "#B4BCC5" : "#1C90FB",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* 계정 안내 */}
          <div className="mt-5 pt-4" style={{ borderTop: "1px solid #F0F0F0" }}>
            <div className="space-y-1">
              {[
                { email: "pm@ct.co.kr",     pw: "ct1234!" },
                { email: "viewer@ct.co.kr", pw: "ct1234!" },
              ].map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => { setEmail(a.email); setPassword(a.pw); }}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded text-left"
                  style={{ background: "#F6F8FA" }}
                >
                  <span className="text-xs" style={{ color: "#666" }}>{a.email}</span>
                  <span className="text-xs" style={{ color: "#AAA" }}>{a.pw}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
