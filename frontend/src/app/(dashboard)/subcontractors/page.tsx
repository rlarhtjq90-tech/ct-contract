"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subcontractors } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { useCanEdit } from "@/lib/auth";
import { Plus, Search, Building2, CheckCircle2, XCircle, AlertCircle, Pencil, Trash2 } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  businessNo: "",
  workType: "",
  ceoName: "",
  contactName: "",
  contactPhone: "",
  memo: "",
};

type BizCheck = "idle" | "ok" | "duplicate" | "unchanged";

function toForm(s: any) {
  return {
    name: s.name || "",
    businessNo: s.businessNo || "",
    workType: s.workType || "",
    ceoName: s.ceoName || "",
    contactName: s.contactInfo?.name || "",
    contactPhone: s.contactInfo?.phone || "",
    memo: s.memo || "",
  };
}

export default function SubcontractorsPage() {
  const queryClient = useQueryClient();
  const canEdit = useCanEdit();
  const [search, setSearch] = useState("");

  // 등록 모달
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bizCheck, setBizCheck] = useState<BizCheck>("idle");

  // 수정 모달
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editBizCheck, setEditBizCheck] = useState<BizCheck>("unchanged");

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["subcontractors"],
    queryFn: subcontractors.getAll,
  });

  /* ── mutations ── */
  const createMutation = useMutation({
    mutationFn: (f: typeof EMPTY_FORM) =>
      subcontractors.create({
        name: f.name,
        businessNo: f.businessNo || undefined,
        workType: f.workType || undefined,
        ceoName: f.ceoName || undefined,
        contactInfo: (f.contactName || f.contactPhone)
          ? { name: f.contactName, phone: f.contactPhone }
          : undefined,
        memo: f.memo || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      setShowModal(false);
      setForm(EMPTY_FORM);
      setBizCheck("idle");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, f }: { id: number; f: typeof EMPTY_FORM }) =>
      subcontractors.update(id, {
        name: f.name,
        businessNo: f.businessNo || undefined,
        workType: f.workType || undefined,
        ceoName: f.ceoName || undefined,
        contactInfo: (f.contactName || f.contactPhone)
          ? { name: f.contactName, phone: f.contactPhone }
          : undefined,
        memo: f.memo || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      queryClient.invalidateQueries({ queryKey: ["subcontracts"] });  // 하도급계약에 표시되는 하도급사명 갱신
      queryClient.invalidateQueries({ queryKey: ["billings"] });      // 기성현황에 표시되는 하도급사명 갱신
      setEditTarget(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => subcontractors.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcontractors"] });
      queryClient.invalidateQueries({ queryKey: ["subcontracts"] });
      setDeleteTarget(null);
    },
  });

  /* ── 등록 모달 핸들러 ── */
  const handleCloseModal = () => {
    setShowModal(false);
    setForm(EMPTY_FORM);
    setBizCheck("idle");
  };

  const handleBizCheck = () => {
    const trimmed = form.businessNo.trim();
    if (!trimmed) return;
    const exists = (data as any[]).some(
      (s) => (s.businessNo || "").replace(/-/g, "") === trimmed.replace(/-/g, "")
    );
    setBizCheck(exists ? "duplicate" : "ok");
  };

  const bizDigits = form.businessNo.replace(/-/g, "").length;
  const bizComplete = bizDigits === 10;
  const bizPartial = bizDigits > 0 && bizDigits < 10;

  const canSave = !!form.name && !createMutation.isPending && bizComplete && bizCheck === "ok";

  /* ── 수정 모달 핸들러 ── */
  const openEdit = (s: any) => {
    setEditTarget(s);
    setEditForm(toForm(s));
    setEditBizCheck("unchanged");
  };

  const handleEditBizCheck = () => {
    const trimmed = editForm.businessNo.trim();
    if (!trimmed) return;
    const exists = (data as any[]).some(
      (s) =>
        s.id !== editTarget?.id &&
        (s.businessNo || "").replace(/-/g, "") === trimmed.replace(/-/g, "")
    );
    setEditBizCheck(exists ? "duplicate" : "ok");
  };

  const editBizDigits = editForm.businessNo.replace(/-/g, "").length;
  const editBizComplete = editBizDigits === 10;
  const editBizPartial = editBizDigits > 0 && editBizDigits < 10;
  const editBizChanged = editForm.businessNo !== (editTarget?.businessNo || "");

  const canEditSave =
    !!editForm.name &&
    !updateMutation.isPending &&
    (!editBizChanged || (editBizComplete && editBizCheck === "ok"));

  /* ── 필터 ── */
  const filtered = (data as any[]).filter(
    (s) =>
      s.name.includes(search) ||
      (s.businessNo || "").includes(search) ||
      (s.workType || "").includes(search) ||
      (s.contactInfo?.name || "").includes(search)
  );

  /* ── 사업자번호 포맷터 ── */
  const formatBizNo = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 10);
    if (digits.length > 5) return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
    if (digits.length > 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return digits;
  };

  return (
    <div>
      <PageHeader
        title="하도급 거래처"
        subtitle="하도급사 관리"
        actions={
          canEdit ? (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
              style={{ background: "rgba(255,255,255,0.2)" }}
              onClick={() => setShowModal(true)}
            >
              <Plus size={14} />
              하도급사 등록
            </button>
          ) : undefined
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
              placeholder="업체명, 사업자번호, 공종, 담당자 검색"
              className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #E6E6E6", width: "320px", color: "#333" }}
            />
          </div>
        </div>

        {/* 테이블 */}
        <div className="ct-card overflow-hidden">
          <table className="ct-table">
            <thead>
              <tr>
                <th>업체명</th>
                <th>사업자번호</th>
                <th>공종</th>
                <th>담당자</th>
                <th>연락처</th>
                <th>하도급계약 수</th>
                <th>등록일</th>
                {canEdit && <th style={{ width: 130 }}>비고</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="text-center py-12" style={{ color: "#AAA" }}>
                    데이터를 불러오는 중...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="text-center py-12">
                    <Building2 size={32} style={{ color: "#DDD", margin: "0 auto 8px" }} />
                    <div style={{ color: "#AAA", fontSize: 13 }}>등록된 하도급사가 없습니다.</div>
                  </td>
                </tr>
              ) : (
                filtered.map((s: any) => (
                  <tr key={s.id}>
                    <td className="font-medium" style={{ color: "#1C90FB" }}>{s.name}</td>
                    <td>{s.businessNo || "-"}</td>
                    <td>{s.workType || "-"}</td>
                    <td>{s.contactInfo?.name || "-"}</td>
                    <td>{s.contactInfo?.phone || "-"}</td>
                    <td>
                      <span className="ct-badge ct-badge-blue">
                        {s.subcontracts?.length || 0}건
                      </span>
                    </td>
                    <td style={{ color: "#888" }}>
                      {new Date(s.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    {canEdit && (
                      <td style={{ whiteSpace: "nowrap" }}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(s)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors hover:bg-[#F5F5F5]"
                            style={{ color: "#1C90FB" }}
                          >
                            <Pencil size={11} />
                            수정
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors hover:bg-[#F5F5F5]"
                            style={{ color: "#FC5356" }}
                          >
                            <Trash2 size={11} />
                            삭제
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 등록 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 className="font-semibold text-base mb-4" style={{ color: "#333" }}>하도급사 등록</h3>
            <SubcontractorForm
              form={form}
              setForm={setForm}
              bizCheck={bizCheck}
              setBizCheck={setBizCheck}
              onBizCheck={handleBizCheck}
              bizDigits={bizDigits}
              bizComplete={bizComplete}
              bizPartial={bizPartial}
              formatBizNo={formatBizNo}
            />
            <div className="flex gap-2 mt-5">
              <button onClick={handleCloseModal} className="flex-1 py-2 rounded text-sm ct-btn-secondary">취소</button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={!canSave}
                className="flex-1 py-2 rounded text-sm text-white font-medium"
                style={{ background: canSave ? "#1C90FB" : "#AAA", cursor: canSave ? "pointer" : "not-allowed" }}
              >
                {createMutation.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 수정 모달 ── */}
      {editTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 className="font-semibold text-base mb-4" style={{ color: "#333" }}>하도급사 수정</h3>
            <SubcontractorForm
              form={editForm}
              setForm={setEditForm}
              bizCheck={editBizCheck}
              setBizCheck={setEditBizCheck}
              onBizCheck={handleEditBizCheck}
              bizDigits={editBizDigits}
              bizComplete={editBizComplete}
              bizPartial={editBizPartial}
              formatBizNo={formatBizNo}
              isEdit
              bizChanged={editBizChanged}
            />
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditTarget(null)} className="flex-1 py-2 rounded text-sm ct-btn-secondary">취소</button>
              <button
                onClick={() => updateMutation.mutate({ id: editTarget.id, f: editForm })}
                disabled={!canEditSave}
                className="flex-1 py-2 rounded text-sm text-white font-medium"
                style={{ background: canEditSave ? "#1C90FB" : "#AAA", cursor: canEditSave ? "pointer" : "not-allowed" }}
              >
                {updateMutation.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 삭제 확인 모달 ── */}
      {deleteTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#FFF0F0" }}>
                <Trash2 size={18} style={{ color: "#FC5356" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#333" }}>하도급사 삭제</p>
                <p className="text-xs mt-0.5" style={{ color: "#888" }}>삭제하면 관련 하도급계약도 함께 삭제됩니다.</p>
              </div>
            </div>
            <p className="text-sm mb-5" style={{ color: "#555" }}>
              <span className="font-medium" style={{ color: "#FC5356" }}>{deleteTarget.name}</span>을(를) 삭제하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 rounded text-sm ct-btn-secondary">취소</button>
              <button
                onClick={() => removeMutation.mutate(deleteTarget.id)}
                disabled={removeMutation.isPending}
                className="flex-1 py-2 rounded text-sm text-white font-medium"
                style={{ background: "#FC5356" }}
              >
                {removeMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 공용 폼 컴포넌트 ── */
function SubcontractorForm({
  form, setForm,
  bizCheck, setBizCheck, onBizCheck,
  bizDigits, bizComplete, bizPartial,
  formatBizNo,
  isEdit = false, bizChanged = false,
}: {
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  bizCheck: BizCheck;
  setBizCheck: React.Dispatch<React.SetStateAction<BizCheck>>;
  onBizCheck: () => void;
  bizDigits: number;
  bizComplete: boolean;
  bizPartial: boolean;
  formatBizNo: (v: string) => string;
  isEdit?: boolean;
  bizChanged?: boolean;
}) {
  const showBizStatus = isEdit ? bizChanged : true;
  const needsBizCheck = isEdit
    ? bizChanged && bizComplete && bizCheck === "idle"
    : bizComplete && bizCheck === "idle";

  return (
    <div className="space-y-3">
      {/* 업체명 */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>업체명*</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="예: (주)한국건설"
          className="w-full px-3 py-2 rounded text-sm outline-none"
          style={{ border: "1px solid #E6E6E6", color: "#333" }}
        />
      </div>

      {/* 사업자번호 + 중복확인 */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>
          사업자번호{!isEdit && "*"} <span style={{ fontWeight: 400, color: "#AAA" }}>(10자리)</span>
        </label>
        <div className="flex gap-2">
          <input
            value={form.businessNo}
            onChange={(e) => {
              setForm((f) => ({ ...f, businessNo: formatBizNo(e.target.value) }));
              setBizCheck("idle");
            }}
            placeholder="예: 201-81-12345"
            maxLength={12}
            inputMode="numeric"
            className="flex-1 px-3 py-2 rounded text-sm outline-none"
            style={{
              border: `1px solid ${
                showBizStatus && bizCheck === "duplicate" ? "#FC5356"
                : showBizStatus && bizCheck === "ok"      ? "#1DC078"
                : showBizStatus && bizPartial             ? "#F5A623"
                : "#E6E6E6"
              }`,
              color: "#333",
            }}
          />
          <button
            type="button"
            onClick={onBizCheck}
            disabled={!bizComplete || (isEdit && !bizChanged)}
            className="px-3 py-2 rounded text-xs font-medium whitespace-nowrap"
            style={{
              background: bizComplete && (!isEdit || bizChanged) ? "#F0F7FF" : "#F5F5F5",
              color: bizComplete && (!isEdit || bizChanged) ? "#1C90FB" : "#BBB",
              border: `1px solid ${bizComplete && (!isEdit || bizChanged) ? "#1C90FB" : "#E6E6E6"}`,
              cursor: bizComplete && (!isEdit || bizChanged) ? "pointer" : "not-allowed",
            }}
          >
            중복확인
          </button>
        </div>
        {showBizStatus && bizPartial && (
          <div className="flex items-center gap-1 mt-1.5">
            <AlertCircle size={13} style={{ color: "#F5A623" }} />
            <span style={{ fontSize: 12, color: "#F5A623" }}>사업자번호 10자리를 모두 입력해주세요. ({bizDigits}/10)</span>
          </div>
        )}
        {showBizStatus && !bizPartial && bizCheck === "duplicate" && (
          <div className="flex items-center gap-1 mt-1.5">
            <XCircle size={13} style={{ color: "#FC5356" }} />
            <span style={{ fontSize: 12, color: "#FC5356" }}>이미 등록된 사업자번호입니다.</span>
          </div>
        )}
        {showBizStatus && !bizPartial && bizCheck === "ok" && (
          <div className="flex items-center gap-1 mt-1.5">
            <CheckCircle2 size={13} style={{ color: "#1DC078" }} />
            <span style={{ fontSize: 12, color: "#1DC078" }}>사용 가능한 사업자번호입니다.</span>
          </div>
        )}
        {showBizStatus && !bizPartial && needsBizCheck && (
          <div className="flex items-center gap-1 mt-1.5">
            <AlertCircle size={13} style={{ color: "#F5A623" }} />
            <span style={{ fontSize: 12, color: "#F5A623" }}>사업자번호 중복확인을 해주세요.</span>
          </div>
        )}
      </div>

      {/* 공종 */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>공종</label>
        <input
          value={form.workType}
          onChange={(e) => setForm((f) => ({ ...f, workType: e.target.value }))}
          placeholder="예: 토목, 전기, 설비"
          className="w-full px-3 py-2 rounded text-sm outline-none"
          style={{ border: "1px solid #E6E6E6", color: "#333" }}
        />
      </div>

      {/* 담당자 + 연락처 */}
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
  );
}
