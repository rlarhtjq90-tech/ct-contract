"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clients } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Search, Building2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  businessNo: "",
  ceoName: "",
  contactName: "",
  contactPhone: "",
  memo: "",
};

type BizCheck = "idle" | "ok" | "duplicate";

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bizCheck, setBizCheck] = useState<BizCheck>("idle");

  const { data = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: clients.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (f: typeof EMPTY_FORM) =>
      clients.create({
        name: f.name,
        businessNo: f.businessNo || undefined,
        ceoName: f.ceoName || undefined,
        contactInfo: (f.contactName || f.contactPhone)
          ? { name: f.contactName, phone: f.contactPhone }
          : undefined,
        memo: f.memo || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowModal(false);
      setForm(EMPTY_FORM);
      setBizCheck("idle");
    },
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
    setBizCheck("idle");
  };

  // 사업자번호 중복확인
  const handleBizCheck = () => {
    const trimmed = form.businessNo.trim();
    if (!trimmed) return;
    const exists = (data as any[]).some(
      (c) => (c.businessNo || "").replace(/-/g, "") === trimmed.replace(/-/g, "")
    );
    setBizCheck(exists ? "duplicate" : "ok");
  };

  // 사업자번호 자릿수 상태
  const bizDigits = form.businessNo.replace(/-/g, "").length;
  const bizComplete = bizDigits === 10;   // 10자리 완성
  const bizPartial  = bizDigits > 0 && bizDigits < 10;  // 입력 중 (미완성)

  // 저장 버튼 활성 조건 — 사업자번호 10자리 완성 + 중복확인 통과 필수
  const canSave =
    !!form.name &&
    !createMutation.isPending &&
    bizComplete &&
    bizCheck === "ok";

  const filtered = data.filter(
    (c: any) =>
      c.name.includes(search) ||
      (c.businessNo || "").includes(search) ||
      (c.ceoName || "").includes(search) ||
      (c.contactInfo?.name || "").includes(search)
  );

  return (
    <div>
      <PageHeader
        title="거래처 마스터"
        subtitle="거래처 관리"
        actions={
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
            style={{ background: "rgba(255,255,255,0.2)" }}
            onClick={() => setShowModal(true)}
          >
            <Plus size={14} />
            거래처등록
          </button>
        }
      />

      <div className="p-6">
        {/* 검색 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="거래처명, 사업자번호, 담당자 검색"
              className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #E6E6E6", width: "300px", color: "#333" }}
            />
          </div>
        </div>

        {/* 테이블 */}
        <div className="ct-card overflow-hidden">
          <table className="ct-table">
            <thead>
              <tr>
                <th>거래처명</th>
                <th>사업자번호</th>
                <th>대표자명</th>
                <th>담당자</th>
                <th>연락처</th>
                <th>도급계약 수</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12" style={{ color: "#AAA" }}>
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Building2 size={32} style={{ color: "#DDD", margin: "0 auto 8px" }} />
                    <div style={{ color: "#AAA", fontSize: 13 }}>등록된 거래처가 없습니다.</div>
                  </td>
                </tr>
              ) : (
                filtered.map((c: any) => (
                  <tr key={c.id} className="cursor-pointer">
                    <td className="font-medium" style={{ color: "#1C90FB" }}>
                      {c.name}
                    </td>
                    <td>{c.businessNo || "-"}</td>
                    <td>{c.ceoName || "-"}</td>
                    <td>{c.contactInfo?.name || "-"}</td>
                    <td>{c.contactInfo?.phone || "-"}</td>
                    <td>
                      <span className="ct-badge ct-badge-blue">
                        {c.projects?.length || 0}건
                      </span>
                    </td>
                    <td style={{ color: "#888" }}>
                      {new Date(c.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <h3 className="font-semibold text-base mb-4" style={{ color: "#333" }}>거래처등록</h3>
            <div className="space-y-3">

              {/* 거래처명 */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>거래처명*</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="예: 한국도로공사"
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ border: "1px solid #E6E6E6", color: "#333" }}
                />
              </div>

              {/* 사업자번호 + 중복확인 */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>사업자번호* <span style={{ fontWeight: 400, color: "#AAA" }}>(10자리)</span></label>
                <div className="flex gap-2">
                  <input
                    value={form.businessNo}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                      let formatted = digits;
                      if (digits.length > 5) {
                        formatted = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
                      } else if (digits.length > 3) {
                        formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                      }
                      setForm((f) => ({ ...f, businessNo: formatted }));
                      setBizCheck("idle");
                    }}
                    placeholder="예: 201-81-12345"
                    maxLength={12}
                    inputMode="numeric"
                    className="flex-1 px-3 py-2 rounded text-sm outline-none"
                    style={{
                      border: `1px solid ${
                        bizCheck === "duplicate" ? "#FC5356"
                        : bizCheck === "ok"       ? "#1DC078"
                        : bizPartial              ? "#F5A623"
                        : "#E6E6E6"
                      }`,
                      color: "#333",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleBizCheck}
                    disabled={!bizComplete}
                    className="px-3 py-2 rounded text-xs font-medium whitespace-nowrap"
                    style={{
                      background: bizComplete ? "#F0F7FF" : "#F5F5F5",
                      color: bizComplete ? "#1C90FB" : "#BBB",
                      border: `1px solid ${bizComplete ? "#1C90FB" : "#E6E6E6"}`,
                      cursor: bizComplete ? "pointer" : "not-allowed",
                    }}
                  >
                    중복확인
                  </button>
                </div>

                {/* 상태 메시지 — 우선순위: 미완성 > 중복 > 사용가능 > 미확인 */}
                {bizPartial && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <AlertCircle size={13} style={{ color: "#F5A623" }} />
                    <span style={{ fontSize: 12, color: "#F5A623" }}>
                      사업자번호 10자리를 모두 입력해주세요. ({bizDigits}/10)
                    </span>
                  </div>
                )}
                {!bizPartial && bizCheck === "duplicate" && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <XCircle size={13} style={{ color: "#FC5356" }} />
                    <span style={{ fontSize: 12, color: "#FC5356" }}>이미 등록된 사업자번호입니다.</span>
                  </div>
                )}
                {!bizPartial && bizCheck === "ok" && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <CheckCircle2 size={13} style={{ color: "#1DC078" }} />
                    <span style={{ fontSize: 12, color: "#1DC078" }}>사용 가능한 사업자번호입니다.</span>
                  </div>
                )}
                {!bizPartial && bizCheck === "idle" && bizComplete && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <AlertCircle size={13} style={{ color: "#F5A623" }} />
                    <span style={{ fontSize: 12, color: "#F5A623" }}>사업자번호 중복확인을 해주세요.</span>
                  </div>
                )}
              </div>

              {/* 대표자명 */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>대표자명</label>
                <input
                  value={form.ceoName}
                  onChange={(e) => setForm((f) => ({ ...f, ceoName: e.target.value }))}
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ border: "1px solid #E6E6E6", color: "#333" }}
                />
              </div>

              {/* 담당자 이름 + 연락처 (2열) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>담당자 이름</label>
                  <input
                    value={form.contactName}
                    onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                    placeholder="예: 홍길동"
                    className="w-full px-3 py-2 rounded text-sm outline-none"
                    style={{ border: "1px solid #E6E6E6", color: "#333" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>연락처</label>
                  <input
                    value={form.contactPhone}
                    onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                    placeholder="예: 010-1234-5678"
                    className="w-full px-3 py-2 rounded text-sm outline-none"
                    style={{ border: "1px solid #E6E6E6", color: "#333" }}
                  />
                </div>
              </div>

              {/* 기타 */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>기타</label>
                <input
                  value={form.memo}
                  onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ border: "1px solid #E6E6E6", color: "#333" }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleCloseModal}
                className="flex-1 py-2 rounded text-sm ct-btn-secondary"
              >취소</button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!canSave}
                className="flex-1 py-2 rounded text-sm text-white font-medium"
                style={{
                  background: canSave ? "#1C90FB" : "#AAA",
                  cursor: canSave ? "pointer" : "not-allowed",
                }}
              >
                {createMutation.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
