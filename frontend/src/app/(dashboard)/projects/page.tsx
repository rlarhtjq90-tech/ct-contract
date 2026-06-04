"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projects, clients as clientsApi, deleteRequests as deleteRequestsApi } from "@/lib/api";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Search, FolderOpen, GitBranch, Trash2, Check, X } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useIsAdmin, useCanEdit } from "@/lib/auth";

const STATUS_LABELS: Record<string, string> = {
  active: "진행중", completed: "완료", suspended: "일시중단", cancelled: "취소",
};
const STATUS_COLORS: Record<string, string> = {
  active: "ct-badge-blue", completed: "ct-badge-green", suspended: "ct-badge-orange", cancelled: "ct-badge-gray",
};

const EMPTY_FORM = {
  clientId: "", projectCode: "", name: "", contractAmount: "",
  contractDate: "", startDate: "", endDate: "", description: "",
};
const EMPTY_CHANGE = { afterAmount: "", reason: "", effectiveDate: "" };

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const canEdit = useCanEdit();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // 변경계약 모달
  const [changeTarget, setChangeTarget] = useState<any>(null);
  const [changeForm, setChangeForm] = useState(EMPTY_CHANGE);

  const { data = [], isLoading } = useQuery({ queryKey: ["projects"], queryFn: projects.getAll });
  const { data: clientsList = [] } = useQuery({ queryKey: ["clients"], queryFn: clientsApi.getAll });
  const { data: allDeleteReqs = [] } = useQuery({ queryKey: ["delete-requests"], queryFn: deleteRequestsApi.getAll });

  // pending 삭제요청 맵: "project_ID" → request
  const pendingMap = useMemo(() => {
    const m: Record<string, any> = {};
    (allDeleteReqs as any[]).filter((r) => r.status === "pending").forEach((r) => {
      m[`${r.targetType}_${r.targetId}`] = r;
    });
    return m;
  }, [allDeleteReqs]);

  const createMutation = useMutation({
    mutationFn: projects.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
  });

  const changeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => projects.addChange(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setChangeTarget(null);
      setChangeForm(EMPTY_CHANGE);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => deleteRequestsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["delete-requests"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => deleteRequestsApi.reject(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["delete-requests"] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projects.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  const formatAmt = fmtMoney;

  // 컬럼 수: [프로젝트코드] + 프로젝트명+발주처+계약금액+계약일+착공일+준공일+상태(7) + [액션]
  const colCount = (isAdmin ? 1 : 0) + 7 + (canEdit ? 1 : 0);

  const filtered = data.filter(
    (p: any) => p.name.includes(search) || (p.projectCode || "").includes(search) || (p.client?.name || "").includes(search)
  );

  return (
    <div>
      <PageHeader
        title="도급계약 관리"
        subtitle={`총 ${data.length}건`}
        actions={
          canEdit ? (
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium text-white"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              <Plus size={14} />도급계약 등록
            </button>
          ) : undefined
        }
      />
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#AAA" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="프로젝트명, 코드, 발주처 검색"
              className="pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
              style={{ border: "1px solid #E6E6E6", width: "300px", color: "#333" }} />
          </div>
        </div>

        <div className="ct-card overflow-hidden">
          <table className="ct-table">
            <thead>
              <tr>
                {isAdmin && <th>프로젝트 코드</th>}
                <th>프로젝트명</th>
                <th>발주처</th>
                <th className="text-center">계약금액</th>
                <th>계약일</th>
                <th>착공일</th>
                <th>준공일</th>
                <th>상태</th>
                {canEdit && <th className="text-center">비고</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={colCount} className="text-center py-12" style={{ color: "#AAA" }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="text-center py-12">
                    <FolderOpen size={32} style={{ color: "#DDD", margin: "0 auto 8px" }} />
                    <div style={{ color: "#AAA", fontSize: 13 }}>등록된 도급계약이 없습니다.</div>
                  </td>
                </tr>
              ) : filtered.map((p: any) => {
                const pendingReq = pendingMap[`project_${p.id}`];
                return (
                  <tr key={p.id} style={pendingReq ? { background: "#FFF8F8" } : {}}>
                    {isAdmin && <td className="font-mono text-xs" style={{ color: "#888" }}>{p.projectCode}</td>}
                    <td className="font-medium" style={{ color: "#1C90FB" }}>{p.name}</td>
                    <td style={{ color: "#666" }}>{p.client?.name || "-"}</td>
                    <td className="text-center">
                      {formatAmt(Number(p.currentAmount))}
                      {Number(p.currentAmount) !== Number(p.contractAmount) && (
                        <div className="text-xs mt-0.5" style={{ color: "#AAA" }}>
                          원계약 {formatAmt(Number(p.contractAmount))}
                        </div>
                      )}
                    </td>
                    <td style={{ color: "#888" }}>{p.contractDate ? new Date(p.contractDate).toLocaleDateString("ko-KR") : "-"}</td>
                    <td style={{ color: "#888" }}>{p.startDate ? new Date(p.startDate).toLocaleDateString("ko-KR") : "-"}</td>
                    <td style={{ color: "#888" }}>{p.endDate ? new Date(p.endDate).toLocaleDateString("ko-KR") : "-"}</td>
                    <td><span className={`ct-badge ${STATUS_COLORS[p.status] || "ct-badge-gray"}`}>{STATUS_LABELS[p.status]}</span></td>
                    {canEdit && (
                      <td className="text-center" style={{ verticalAlign: "middle" }}>
                        <div className="flex flex-col items-center gap-1.5">

                          {/* Admin: 요청확인란 */}
                          {isAdmin && pendingReq && (
                            <div className="rounded-lg px-2 py-1.5 text-left w-full"
                              style={{ border: "1px solid #E6E6E6", minWidth: 120 }}>
                              <div className="text-xs font-medium mb-1.5" style={{ color: "#FC5356" }}>
                                ⚠ 삭제 요청
                              </div>
                              {pendingReq.reason && (
                                <p className="text-xs mb-2" style={{ color: "#666", wordBreak: "break-word" }}>
                                  {pendingReq.reason}
                                </p>
                              )}
                              <div className="flex gap-1">
                                <button onClick={() => approveMutation.mutate(pendingReq.id)}
                                  disabled={approveMutation.isPending}
                                  className="flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-[#F5F5F5]"
                                  style={{ color: "#27AE60" }}>
                                  <Check size={10} />승인
                                </button>
                                <button onClick={() => rejectMutation.mutate(pendingReq.id)}
                                  disabled={rejectMutation.isPending}
                                  className="flex-1 inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-[#F5F5F5]"
                                  style={{ color: "#FC5356" }}>
                                  <X size={10} />거절
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 버튼 그룹: 변경 + 삭제 */}
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => { setChangeTarget(p); setChangeForm(EMPTY_CHANGE); }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-[#F5F5F5]"
                              style={{ color: "#1C90FB" }}>
                              <GitBranch size={11} />변경
                            </button>
                            <button
                              onClick={() => { if (confirm(`"${p.name}" 을(를) 삭제하시겠습니까?`)) deleteMutation.mutate(p.id); }}
                              disabled={deleteMutation.isPending}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors hover:bg-[#F5F5F5]"
                              style={{ color: "#FC5356" }}>
                              <Trash2 size={11} />삭제
                            </button>
                          </div>

                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 도급계약 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
            <h3 className="font-semibold text-base mb-4" style={{ color: "#333" }}>도급계약 등록</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>발주처*</label>
                <select value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ border: "1px solid #E6E6E6", color: "#333" }}>
                  <option value="">발주처 선택</option>
                  {clientsList.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>프로젝트명*</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ border: "1px solid #E6E6E6", color: "#333" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>프로젝트 코드*</label>
                <input value={form.projectCode} onChange={(e) => setForm((f) => ({ ...f, projectCode: e.target.value }))}
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ border: "1px solid #E6E6E6", color: "#333" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>계약금액(원)*</label>
                <input type="text" inputMode="numeric" value={form.contractAmount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setForm((f) => ({ ...f, contractAmount: raw ? Number(raw).toLocaleString("ko-KR") : "" }));
                  }}
                  placeholder="예: 12,000,000,000"
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ border: "1px solid #E6E6E6", color: "#333" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>계약일</label>
                <input type="date" value={form.contractDate} onChange={(e) => setForm((f) => ({ ...f, contractDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ border: "1px solid #E6E6E6", color: "#333" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>착공일</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ border: "1px solid #E6E6E6", color: "#333" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>준공일</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded text-sm outline-none"
                  style={{ border: "1px solid #E6E6E6", color: "#333" }} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded text-sm ct-btn-secondary">취소</button>
              <button
                onClick={() => createMutation.mutate({
                  ...form, clientId: parseInt(form.clientId),
                  contractAmount: parseInt(form.contractAmount.replace(/,/g, "")),
                })}
                disabled={!form.clientId || !form.name || !form.contractAmount || createMutation.isPending}
                className="flex-1 py-2 rounded text-sm text-white font-medium"
                style={{ background: "#1C90FB" }}>
                {createMutation.isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 변경계약 모달 */}
      {changeTarget && (() => {
        const currentAmt = Number(changeTarget.currentAmount);
        const afterAmt = parseInt(changeForm.afterAmount.replace(/,/g, "")) || 0;
        const delta = afterAmt - currentAmt;
        const hasAfter = changeForm.afterAmount !== "";
        return (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className="bg-white rounded-xl p-6 w-full max-w-sm" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
              <h3 className="font-semibold text-base mb-1" style={{ color: "#333" }}>변경계약 등록</h3>
              <p className="text-xs mb-3" style={{ color: "#888" }}>{changeTarget.name}</p>
              {/* 현재 계약금액 참조 */}
              <div className="rounded-lg px-3 py-2 mb-4 text-xs" style={{ background: "#F7F8FA", border: "1px solid #EBEBEB" }}>
                <span style={{ color: "#999" }}>현재 계약금액</span>
                <span className="ml-2 font-semibold" style={{ color: "#333" }}>{fmtMoney(currentAmt)}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>변경 후 계약금액 (원)*</label>
                  <input type="text" inputMode="numeric" value={changeForm.afterAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setChangeForm((f) => ({ ...f, afterAmount: raw ? Number(raw).toLocaleString("ko-KR") : "" }));
                    }}
                    placeholder="예: 1,200,000,000"
                    className="w-full px-3 py-2 rounded text-sm outline-none"
                    style={{ border: "1px solid #E6E6E6", color: "#333" }} />
                  {/* 증감액 미리보기 */}
                  {hasAfter && (
                    <div className="mt-1.5 text-xs font-medium" style={{ color: delta >= 0 ? "#1C90FB" : "#FC5356" }}>
                      증감액: {delta >= 0 ? "+" : ""}{fmtMoney(delta)}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>변경일</label>
                  <input type="date" value={changeForm.effectiveDate}
                    onChange={(e) => setChangeForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded text-sm outline-none"
                    style={{ border: "1px solid #E6E6E6", color: "#333" }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "#666" }}>변경사유*</label>
                  <textarea value={changeForm.reason}
                    onChange={(e) => setChangeForm((f) => ({ ...f, reason: e.target.value }))}
                    rows={3} placeholder="변경 사유를 입력하세요"
                    className="w-full px-3 py-2 rounded text-sm outline-none resize-none"
                    style={{ border: "1px solid #E6E6E6", color: "#333" }} />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setChangeTarget(null)} className="flex-1 py-2 rounded text-sm ct-btn-secondary">취소</button>
                <button
                  onClick={() => changeMutation.mutate({
                    id: changeTarget.id,
                    data: { afterAmount: afterAmt, reason: changeForm.reason, effectiveDate: changeForm.effectiveDate || undefined },
                  })}
                  disabled={!changeForm.afterAmount || afterAmt === currentAmt || !changeForm.reason || changeMutation.isPending}
                  className="flex-1 py-2 rounded text-sm text-white font-medium"
                  style={{ background: "#1C90FB" }}>
                  {changeMutation.isPending ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
